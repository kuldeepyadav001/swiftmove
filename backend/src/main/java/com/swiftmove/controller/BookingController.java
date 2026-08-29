package com.swiftmove.controller;

import com.swiftmove.dto.BookingRequest;
import com.swiftmove.model.Booking;
import com.swiftmove.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<Booking> create(@RequestBody BookingRequest req) {
        return ResponseEntity.ok(bookingService.create(req, getEmail()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Booking>> myBookings() {
        return ResponseEntity.ok(bookingService.getShipperBookings(getEmail()));
    }

    @GetMapping("/driver/my")
    public ResponseEntity<List<Booking>> driverBookings() {
        return ResponseEntity.ok(bookingService.getDriverBookings(getEmail()));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Booking>> pendingJobs() {
        return ResponseEntity.ok(bookingService.getPendingJobs());
    }
    @PutMapping("/{id}/accept")
    public ResponseEntity<Booking> accept(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.accept(id, getEmail()));
    }

    // --- NEW DELIVERY HAND-OFF ENDPOINTS ---

    @PutMapping("/{id}/request-delivery")
    public ResponseEntity<Booking> requestDelivery(@PathVariable String id, @RequestBody Map<String, Object> req) {
        @SuppressWarnings("unchecked")
        List<String> images = (List<String>) req.get("images");
        return ResponseEntity.ok(bookingService.requestDelivery(id, images, getEmail()));
    }

    @PutMapping("/{id}/resend-delivery-otp")
    public ResponseEntity<Booking> resendOtp(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.resendDeliveryOtp(id, getEmail()));
    }

    @PutMapping("/{id}/verify-delivery-otp")
    public ResponseEntity<Booking> verifyOtp(@PathVariable String id, @RequestBody Map<String, String> req) {
        return ResponseEntity.ok(bookingService.verifyDeliveryOtp(id, req.get("otp"), getEmail()));
    }

    @PutMapping("/{id}/report-dispute")
    public ResponseEntity<Booking> reportDispute(@PathVariable String id, @RequestBody Map<String, String> req) {
        return ResponseEntity.ok(bookingService.reportDispute(id, req.get("reason"), getEmail()));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancel(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.cancel(id, getEmail()));
    }

    private String getEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}