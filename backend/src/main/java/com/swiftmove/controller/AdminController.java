package com.swiftmove.controller;

import com.swiftmove.model.Booking;
import com.swiftmove.model.User;
import com.swiftmove.model.enums.Role;
import com.swiftmove.repository.BookingRepository;
import com.swiftmove.repository.UserRepository;
import com.swiftmove.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository    userRepository;
    private final BookingRepository bookingRepository;
    private final BookingService    bookingService;   // ← NEW: inject service

    // GET /api/admin/stats — dashboard overview numbers
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        long totalUsers    = userRepository.count();
        long totalShippers = userRepository.countByRole(Role.SHIPPER);
        long totalDrivers  = userRepository.countByRole(Role.DRIVER);
        long totalBookings = bookingRepository.count();
        long pending       = bookingRepository.countByStatus("PENDING");
        long assigned      = bookingRepository.countByStatus("ASSIGNED");
        long delivered     = bookingRepository.countByStatus("DELIVERED");
        long cancelled     = bookingRepository.countByStatus("CANCELLED");

        // Total revenue/payouts — computed on MongoDB via $group/$sum,
        // NOT by loading all delivered bookings into Java memory.
        Long totalRevenue = bookingRepository.sumAppCutByStatus("DELIVERED");
        Long totalPayouts = bookingRepository.sumDriverCutByStatus("DELIVERED");

        return ResponseEntity.ok(Map.of(
                "totalUsers",    totalUsers,
                "totalShippers", totalShippers,
                "totalDrivers",  totalDrivers,
                "totalBookings", totalBookings,
                "pending",       pending,
                "assigned",      assigned,
                "delivered",     delivered,
                "cancelled",     cancelled,
                "totalRevenue",  totalRevenue != null ? totalRevenue : 0L,
                "totalPayouts",  totalPayouts != null ? totalPayouts : 0L
        ));
    }

    // GET /api/admin/users — all users
    @GetMapping("/users")
    public ResponseEntity<List<User>> allUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // GET /api/admin/users/shippers
    @GetMapping("/users/shippers")
    public ResponseEntity<List<User>> shippers() {
        return ResponseEntity.ok(userRepository.findAllByRole(Role.SHIPPER));
    }

    // GET /api/admin/users/drivers
    @GetMapping("/users/drivers")
    public ResponseEntity<List<User>> drivers() {
        return ResponseEntity.ok(userRepository.findAllByRole(Role.DRIVER));
    }

    // GET /api/admin/bookings — all bookings (paginated)
    @GetMapping("/bookings")
    public ResponseEntity<List<Booking>> allBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 200));
        return ResponseEntity.ok(bookingRepository.findAllByOrderByCreatedAtDesc(pageable).getContent());
    }

    // DELETE /api/admin/users/{id} — remove user
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable String id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    // ── NEW: POST /api/admin/bookings/backfill-splits ──────────────────────
    // Fixes old bookings that were saved with driverCut=0 and appCut=0.
    // Uses current rate card commission % to compute the split retroactively.
    @PostMapping("/bookings/backfill-splits")
    public ResponseEntity<Map<String, Integer>> backfillSplits() {
        return ResponseEntity.ok(bookingService.backfillFareSplits());
    }
}