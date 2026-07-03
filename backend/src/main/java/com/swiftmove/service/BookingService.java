package com.swiftmove.service;

import com.swiftmove.controller.LocationController;
import com.swiftmove.model.Booking;
import com.swiftmove.model.User;
import com.swiftmove.repository.BookingRepository;
import com.swiftmove.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository    userRepository;
    private final LocationController locationController;
    private final EmailService emailService;

    // --- CORE LIFECYCLE METHODS ---

    public Booking create(Map<String, Object> req, String shipperEmail) {
        User shipper = userRepository.findByEmail(shipperEmail)
                .orElseThrow(() -> new RuntimeException("Shipper not found"));

        Booking b = Booking.builder()
                .shipperUserId(shipper.getId()).shipperName(shipper.getName()).shipperEmail(shipper.getEmail())
                .pickup((String) req.get("pickup")).drop((String) req.get("drop"))
                .goodsType((String) req.get("goodsType")).weight((String) req.get("weight"))
                .vehicleType((String) req.get("vehicleType")).vehicleLabel((String) req.get("vehicleLabel"))
                .pickupType((String) req.getOrDefault("pickupType", "now"))
                .totalFare(toLong(req.get("totalFare"))).driverCut(toLong(req.get("driverCut"))).appCut(toLong(req.get("appCut")))
                .distanceKm(toDouble(req.get("distanceKm"))).fareBreakdown((String) req.getOrDefault("fareBreakdown", ""))
                .status("PENDING").createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        Booking saved = bookingRepository.save(b);
        locationController.notifyNewJob(saved);
        return saved;
    }

    public Booking accept(String bookingId, String driverEmail) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        User driver = userRepository.findByEmail(driverEmail).orElseThrow(() -> new RuntimeException("Driver not found"));

        if (!"PENDING".equals(b.getStatus())) throw new RuntimeException("Job no longer available");

        b.setDriverUserId(driver.getId()); b.setDriverName(driver.getName()); b.setDriverEmail(driver.getEmail());
        b.setStatus("ASSIGNED"); b.setAcceptedAt(LocalDateTime.now()); b.setUpdatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(b);
        locationController.notifyStatusUpdate(saved.getId(), "ASSIGNED", driver.getId(), driver.getName());
        return saved;
    }

    // --- NEW: DELIVERY HAND-OFF & OTP LOGIC ---

    /**
     * STEP 1: Driver arrives and uploads photos.
     * Generates a 6-digit OTP and sends it to the shipper.
     */
    public Booking requestDelivery(String bookingId, List<String> images, String driverEmail) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        
        // Security check: Only the assigned driver can request delivery
        if (!driverEmail.equals(b.getDriverEmail())) throw new RuntimeException("Unauthorized Access");

        // Generate 6-digit OTP
        String otp = String.valueOf((int) (Math.random() * 900000) + 100000);
        
        b.setStatus("DELIVERED_PENDING_CONFIRMATION");
        b.setDriverProofImages(images);
        b.setDeliveryOtp(otp);
        b.setDeliveryOtpExpiry(LocalDateTime.now().plusMinutes(30)); // 30-min expiry
        b.setDeliveryOtpResendCount(0);
        b.setUpdatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(b);
        
        // Trigger Email Notification to Shipper
        emailService.sendDeliveryOtp(b.getShipperEmail(), b.getShipperName(), otp, b.getId());
        
        // Notify via WebSocket status update
        locationController.notifyStatusUpdate(saved.getId(), saved.getStatus(), saved.getDriverUserId(), saved.getDriverName());
        return saved;
    }

    /**
     * OPTIONAL STEP: Resend OTP if not received.
     * Capped at 3 attempts.
     */
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
        emailService.sendDeliveryOtp(b.getShipperEmail(), b.getShipperName(), newOtp, b.getId());
        return saved;
    }

    /**
     * STEP 2: Final Verification.
     * Driver enters OTP provided by the shipper.
     */
    public Booking verifyDeliveryOtp(String bookingId, String userOtp, String driverEmail) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        
        // Check Expiry
        if (b.getDeliveryOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }
        
        // Check Validity
        if (!b.getDeliveryOtp().equals(userOtp)) {
            throw new RuntimeException("Invalid OTP code.");
        }

        // Complete the delivery
        b.setStatus("DELIVERED");
        b.setDeliveredAt(LocalDateTime.now());
        b.setDeliveryOtp(null); // Clear OTP from DB after success
        b.setDeliveryOtpExpiry(null);
        b.setUpdatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(b);
        locationController.notifyStatusUpdate(saved.getId(), "DELIVERED", saved.getDriverUserId(), saved.getDriverName());
        return saved;
    }

    /**
     * STEP 3: Handle Issues.
     * Moves booking to DISPUTED status for Admin review.
     */
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
        if (!shipperEmail.equals(b.getShipperEmail())) throw new RuntimeException("Unauthorized");
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

    public List<Booking> getPendingJobs() { return bookingRepository.findByStatusOrderByCreatedAtDesc("PENDING"); }
    public List<Booking> getAllBookings() { return bookingRepository.findAllByOrderByCreatedAtDesc(); }

    private long toLong(Object val) {
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return 0; }
    }

    private double toDouble(Object val) {
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return 0; }
    }
}