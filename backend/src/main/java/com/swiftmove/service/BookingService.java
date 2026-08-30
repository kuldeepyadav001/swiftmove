package com.swiftmove.service;

import com.swiftmove.controller.LocationController;
import com.swiftmove.dto.BookingRequest;
import com.swiftmove.dto.FareDtos.FareRequest;
import com.swiftmove.dto.FareDtos.FareResponse;
import com.swiftmove.model.Booking;
import com.swiftmove.model.KycDocument;
import com.swiftmove.model.RateCard;
import com.swiftmove.model.User;
import com.swiftmove.repository.BookingRepository;
import com.swiftmove.repository.KycRepository;
import com.swiftmove.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Pageable;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final KycRepository kycRepository;
    private final LocationController locationController;
    private final EmailService emailService;
    private final DynamicFareService dynamicFareService;

    // --- CORE LIFECYCLE METHODS ---

    public Booking create(BookingRequest req, String shipperEmail) {
        User shipper = userRepository.findByEmail(shipperEmail)
                .orElseThrow(() -> new RuntimeException("Shipper not found"));

        String pickup = req.getPickup();
        String drop = req.getDrop();
        String vehicleType = req.getVehicleType();
        int waitingMins = req.getEstimatedWaitingMins();

        // Precise coordinates from the map picker (nullable — older clients
        // or a manual text-only fallback will simply omit these)
        Double pickupLat = req.getPickupLat();
        Double pickupLng = req.getPickupLng();
        Double dropLat   = req.getDropLat();
        Double dropLng   = req.getDropLng();

        // ── 1. Authoritatively recalculate fare on the server ──────────────
        // Never trust the client for money. Recompute using the same service
        // that powers the frontend fare estimate.
        FareRequest fareReq = new FareRequest();
        fareReq.setPickup(pickup);
        fareReq.setDrop(drop);
        fareReq.setVehicleType(vehicleType);
        fareReq.setEstimatedWaitingMins(waitingMins);
        fareReq.setPickupLat(pickupLat);
        fareReq.setPickupLng(pickupLng);
        fareReq.setDropLat(dropLat);
        fareReq.setDropLng(dropLng);

        FareResponse fare = dynamicFareService.calculate(fareReq, shipper.getId());

        // ── 2. Build booking with the SERVER-computed split ────────────────
        Booking b = Booking.builder()
                .shipperUserId(shipper.getId())
                .shipperName(shipper.getName())
                .shipperEmail(shipper.getEmail())
                .pickup(pickup)
                .drop(drop)
                .pickupLat(pickupLat)
                .pickupLng(pickupLng)
                .dropLat(dropLat)
                .dropLng(dropLng)
                .goodsType(req.getGoodsType())
                .weight(req.getWeight())
                .vehicleType(vehicleType)
                .vehicleLabel(fare.getVehicleLabel())
                .pickupType(req.getPickupType() != null ? req.getPickupType() : "now")
                // ── Money fields (server-computed, single source of truth) ──
                .totalFare(fare.getTotalFare())
                .driverCut(fare.getDriverPayout())
                .appCut(fare.getPlatformCommission())
                .commissionPct(fare.getCommissionPct())
                .distanceKm(fare.getDistanceKm())
                .fareBreakdown(fare.getBreakdown())
                // ── Status & timestamps ──
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Booking saved = bookingRepository.save(b);
        locationController.notifyNewJob(saved);
        return saved;
    }

    public Booking accept(String bookingId, String driverEmail) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        User driver = userRepository.findByEmail(driverEmail)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        if (!"PENDING".equals(b.getStatus()))
            throw new RuntimeException("Job no longer available");

        // ── Server-side KYC gate ──
        // Prevents unverified drivers from accepting jobs even if the UI
        // somehow lets them through. The UI check is a UX hint; this is
        // the actual enforcement layer.
        Optional<KycDocument> kyc = kycRepository.findByDriverId(driver.getId());
        if (kyc.isEmpty() || !"APPROVED".equals(kyc.get().getStatus())) {
            log.warn("Driver {} attempted to accept job {} without approved KYC (status: {})",
                    driver.getId(), bookingId, kyc.map(KycDocument::getStatus).orElse("NONE"));
            throw new RuntimeException("KYC verification required. Please upload your documents and wait for approval.");
        }

        b.setDriverUserId(driver.getId());
        b.setDriverName(driver.getName());
        b.setDriverEmail(driver.getEmail());
        b.setDriverPhone(driver.getPhone());
        b.setStatus("ASSIGNED");
        b.setAcceptedAt(LocalDateTime.now());
        b.setUpdatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(b);
        locationController.notifyStatusUpdate(saved.getId(), "ASSIGNED", driver.getId(), driver.getName());
        return saved;
    }

    // --- DELIVERY HAND-OFF & OTP LOGIC (unchanged) ---

    public Booking requestDelivery(String bookingId, List<String> images, String driverEmail) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        if (!driverEmail.equals(b.getDriverEmail()))
            throw new RuntimeException("Unauthorized Access");

        String otp = String.format("%06d", SECURE_RANDOM.nextInt(900000) + 100000);
        b.setStatus("DELIVERED_PENDING_CONFIRMATION");
        b.setDriverProofImages(images);
        b.setDeliveryOtp(otp);
        b.setDeliveryOtpExpiry(LocalDateTime.now().plusMinutes(30));
        b.setDeliveryOtpResendCount(0);
        b.setUpdatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(b);

        boolean emailSent = emailService.sendDeliveryOtp(b.getShipperEmail(), b.getShipperName(), otp, b.getId());
        if (!emailSent) {
            log.warn("Delivery OTP email FAILED to send for booking {} (shipper: {}).", b.getId(), b.getShipperEmail());
        }
        saved.setOtpEmailSent(emailSent);

        locationController.notifyStatusUpdate(saved.getId(), saved.getStatus(), saved.getDriverUserId(),
                saved.getDriverName());
        return saved;
    }

    public Booking resendDeliveryOtp(String bookingId, String driverEmail) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        if (b.getDeliveryOtpResendCount() >= 3) {
            throw new RuntimeException("Maximum resend limit (3) reached. Contact support.");
        }
        String newOtp = String.format("%06d", SECURE_RANDOM.nextInt(900000) + 100000);
        b.setDeliveryOtp(newOtp);
        b.setDeliveryOtpExpiry(LocalDateTime.now().plusMinutes(30));
        b.setDeliveryOtpResendCount(b.getDeliveryOtpResendCount() + 1);

        Booking saved = bookingRepository.save(b);
boolean emailSent = emailService.sendDeliveryOtp(b.getShipperEmail(), b.getShipperName(), newOtp, b.getId());
if (!emailSent) {
    log.warn("Resend of delivery OTP email FAILED for booking {} (shipper: {}).", b.getId(), b.getShipperEmail());
}
saved.setOtpEmailSent(emailSent);
return saved;
    }

    public Booking verifyDeliveryOtp(String bookingId, String userOtp, String driverEmail) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        if (b.getDeliveryOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }
        if (!b.getDeliveryOtp().equals(userOtp)) {
            throw new RuntimeException("Invalid OTP code.");
        }
        b.setStatus("DELIVERED");
        b.setDeliveredAt(LocalDateTime.now());
        b.setDeliveryOtp(null);
        b.setDeliveryOtpExpiry(null);
        b.setUpdatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(b);
        locationController.notifyStatusUpdate(saved.getId(), "DELIVERED", saved.getDriverUserId(),
                saved.getDriverName());
        return saved;
    }

    public Booking reportDispute(String bookingId, String reason, String email) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        b.setStatus("DISPUTED");
        b.setDisputeReason(reason);
        b.setUpdatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(b);
        locationController.notifyStatusUpdate(saved.getId(), "DISPUTED", null, null);
        return saved;
    }

    // --- OTHER METHODS & HELPERS ---

    public Booking cancel(String bookingId, String shipperEmail) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        if (!shipperEmail.equals(b.getShipperEmail()))
            throw new RuntimeException("Unauthorized");
        b.setStatus("CANCELLED");
        return bookingRepository.save(b);
    }

    public Booking rateBooking(String bookingId, Integer stars, String shipperEmail) {
        if (stars == null || stars < 1 || stars > 5)
            throw new RuntimeException("Rating must be between 1 and 5 stars.");
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        if (!shipperEmail.equals(b.getShipperEmail()))
            throw new RuntimeException("Only the shipper can rate this booking.");
        if (!"DELIVERED".equals(b.getStatus()))
            throw new RuntimeException("Can only rate delivered bookings.");
        b.setShipperRating(stars);
        b.setUpdatedAt(LocalDateTime.now());
        return bookingRepository.save(b);
    }

    public List<Booking> getShipperBookings(String email, Pageable pageable) {
        User u = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        return bookingRepository.findByShipperUserIdOrderByCreatedAtDesc(u.getId(), pageable).getContent();
    }

    public List<Booking> getDriverBookings(String email, Pageable pageable) {
        User u = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        return bookingRepository.findByDriverUserIdOrderByCreatedAtDesc(u.getId(), pageable).getContent();
    }

    public List<Booking> getPendingJobs(Pageable pageable) {
        return bookingRepository.findByStatusOrderByCreatedAtDesc("PENDING", pageable).getContent();
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAllByOrderByCreatedAtDesc();
    }

    // ── BACKFILL: Fix old bookings that were saved with driverCut=0, appCut=0 ──
    public Map<String, Integer> backfillFareSplits() {
        List<Booking> broken = bookingRepository.findAll().stream()
                .filter(b -> b.getTotalFare() > 0
                        && b.getDriverCut() == 0
                        && b.getAppCut() == 0)
                .toList();

        int fixed = 0;
        for (Booking b : broken) {
            try {
                String city = detectCityFromPickup(b.getPickup());
                RateCard rc = dynamicFareService.getRateCard(city, b.getVehicleType());
                double commPct = rc.getCommissionPct();

                long appCut = Math.round(b.getTotalFare() * commPct);
                long driverCut = b.getTotalFare() - appCut;

                b.setAppCut(appCut);
                b.setDriverCut(driverCut);
                b.setCommissionPct(commPct);
                b.setUpdatedAt(LocalDateTime.now());
                bookingRepository.save(b);
                fixed++;
            } catch (Exception e) {
                log.warn("Backfill skipped for booking {}: {}", b.getId(), e.getMessage());
            }
        }
        log.info("Backfill complete: fixed {} of {} broken bookings", fixed, broken.size());
        return Map.of("total", broken.size(), "fixed", fixed);
    }

    private String detectCityFromPickup(String pickup) {
        if (pickup == null)
            return "kanpur";
        return pickup.toLowerCase().split(",")[0].trim();
    }

    private long toLong(Object val) {
        if (val == null)
            return 0;
        if (val instanceof Number)
            return ((Number) val).longValue();
        try {
            return Long.parseLong(val.toString());
        } catch (Exception e) {
            return 0;
        }
    }

    // Unlike toLong/toDouble, returns null (not 0) when absent — 0,0 is a
    // real place on Earth and would silently corrupt distance calculations.
    private Double toDoubleOrNull(Object val) {
        if (val == null)
            return null;
        if (val instanceof Number)
            return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private double toDouble(Object val) {
        if (val == null)
            return 0;
        if (val instanceof Number)
            return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (Exception e) {
            return 0;
        }
    }
}