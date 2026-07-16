package com.swiftmove.service;

import com.swiftmove.controller.LocationController;
import com.swiftmove.dto.FareDtos.FareRequest;
import com.swiftmove.dto.FareDtos.FareResponse;
import com.swiftmove.model.Booking;
import com.swiftmove.model.RateCard;
import com.swiftmove.model.User;
import com.swiftmove.repository.BookingRepository;
import com.swiftmove.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final LocationController locationController;
    private final EmailService emailService;
    private final DynamicFareService dynamicFareService; // ← NEW

    // --- CORE LIFECYCLE METHODS ---

    public Booking create(Map<String, Object> req, String shipperEmail) {
        User shipper = userRepository.findByEmail(shipperEmail)
                .orElseThrow(() -> new RuntimeException("Shipper not found"));

        String pickup = (String) req.get("pickup");
        String drop = (String) req.get("drop");
        String vehicleType = (String) req.get("vehicleType");
        int waitingMins = (int) toLong(req.getOrDefault("estimatedWaitingMins", 0));

        // Precise coordinates from the map picker (nullable — older clients
        // or a manual text-only fallback will simply omit these)
        Double pickupLat = toDoubleOrNull(req.get("pickupLat"));
        Double pickupLng = toDoubleOrNull(req.get("pickupLng"));
        Double dropLat   = toDoubleOrNull(req.get("dropLat"));
        Double dropLng   = toDoubleOrNull(req.get("dropLng"));

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

        // ── 2. Sanity check vs what the client sent ────────────────────────
        long clientTotal = toLong(req.get("totalFare"));
        if (clientTotal > 0 && Math.abs(clientTotal - fare.getTotalFare()) > 50) {
            log.warn("Fare mismatch! client={} server={} — using server value",
                    clientTotal, fare.getTotalFare());
        }

        // ── 3. Build booking with the SERVER-computed split ────────────────
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
                .goodsType((String) req.get("goodsType"))
                .weight((String) req.get("weight"))
                .vehicleType(vehicleType)
                .vehicleLabel(fare.getVehicleLabel())
                .pickupType((String) req.getOrDefault("pickupType", "now"))
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

        b.setDriverUserId(driver.getId());
        b.setDriverName(driver.getName());
        b.setDriverEmail(driver.getEmail());
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

        String otp = String.valueOf((int) (Math.random() * 900000) + 100000);
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
        String newOtp = String.valueOf((int) (Math.random() * 900000) + 100000);
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

    public List<Booking> getShipperBookings(String email) {
        User u = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        return bookingRepository.findByShipperUserIdOrderByCreatedAtDesc(u.getId());
    }

    public List<Booking> getDriverBookings(String email) {
        User u = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        return bookingRepository.findByDriverUserIdOrderByCreatedAtDesc(u.getId());
    }

    public List<Booking> getPendingJobs() {
        return bookingRepository.findByStatusOrderByCreatedAtDesc("PENDING");
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