package com.swiftmove.controller;

import com.swiftmove.dto.BookingRequest;
import com.swiftmove.dto.DeliveryDtos;
import com.swiftmove.model.Booking;
import com.swiftmove.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

    // Paginated: ?page=0&size=20  (default: page=0, size=50)
    @GetMapping("/my")
    public ResponseEntity<List<Booking>> myBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(bookingService.getShipperBookings(getEmail(), pageable));
    }

    @GetMapping("/driver/my")
    public ResponseEntity<List<Booking>> driverBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(bookingService.getDriverBookings(getEmail(), pageable));
    }

    // Pending jobs: cap at 50 to prevent flooding driver dashboard
    @GetMapping("/pending")
    public ResponseEntity<List<Booking>> pendingJobs() {
        Pageable pageable = PageRequest.of(0, 50);
        return ResponseEntity.ok(bookingService.getPendingJobs(pageable));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<Booking> accept(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.accept(id, getEmail()));
    }

    @PutMapping("/{id}/request-delivery")
    public ResponseEntity<Booking> requestDelivery(
            @PathVariable String id, @RequestBody DeliveryDtos.RequestDeliveryRequest req) {
        return ResponseEntity.ok(bookingService.requestDelivery(id, req.getImages(), getEmail()));
    }

    @PutMapping("/{id}/resend-delivery-otp")
    public ResponseEntity<Booking> resendOtp(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.resendDeliveryOtp(id, getEmail()));
    }

    @PutMapping("/{id}/verify-delivery-otp")
    public ResponseEntity<Booking> verifyOtp(
            @PathVariable String id, @RequestBody DeliveryDtos.VerifyOtpRequest req) {
        return ResponseEntity.ok(bookingService.verifyDeliveryOtp(id, req.getOtp(), getEmail()));
    }

    @PutMapping("/{id}/report-dispute")
    public ResponseEntity<Booking> reportDispute(
            @PathVariable String id, @RequestBody DeliveryDtos.DisputeRequest req) {
        return ResponseEntity.ok(bookingService.reportDispute(id, req.getReason(), getEmail()));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancel(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.cancel(id, getEmail()));
    }

    // Rate a delivered booking (1-5 stars)
    @PutMapping("/{id}/rate")
    public ResponseEntity<Booking> rateBooking(
            @PathVariable String id, @RequestBody Map<String, Integer> req) {
        return ResponseEntity.ok(bookingService.rateBooking(id, req.get("stars"), getEmail()));
    }

    private String getEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
