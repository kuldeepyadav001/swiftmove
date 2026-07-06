package com.swiftmove.controller;

import com.swiftmove.model.Booking;
import com.swiftmove.model.User;
import com.swiftmove.model.enums.Role;
import com.swiftmove.repository.BookingRepository;
import com.swiftmove.repository.UserRepository;
import com.swiftmove.service.BookingService;
import lombok.RequiredArgsConstructor;
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
        long totalShippers = userRepository.findAllByRole(Role.SHIPPER).size();
        long totalDrivers  = userRepository.findAllByRole(Role.DRIVER).size();
        long totalBookings = bookingRepository.count();
        long pending       = bookingRepository.countByStatus("PENDING");
        long assigned      = bookingRepository.countByStatus("ASSIGNED");
        long delivered     = bookingRepository.countByStatus("DELIVERED");
        long cancelled     = bookingRepository.countByStatus("CANCELLED");

        // Total revenue = sum of app commission from delivered bookings
        long totalRevenue = bookingRepository
                .findByStatusOrderByCreatedAtDesc("DELIVERED")
                .stream()
                .mapToLong(Booking::getAppCut)
                .sum();

        long totalPayouts = bookingRepository
                .findByStatusOrderByCreatedAtDesc("DELIVERED")
                .stream()
                .mapToLong(Booking::getDriverCut)
                .sum();

        return ResponseEntity.ok(Map.of(
                "totalUsers",    totalUsers,
                "totalShippers", totalShippers,
                "totalDrivers",  totalDrivers,
                "totalBookings", totalBookings,
                "pending",       pending,
                "assigned",      assigned,
                "delivered",     delivered,
                "cancelled",     cancelled,
                "totalRevenue",  totalRevenue,
                "totalPayouts",  totalPayouts
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

    // GET /api/admin/bookings — all bookings
    @GetMapping("/bookings")
    public ResponseEntity<List<Booking>> allBookings() {
        return ResponseEntity.ok(bookingRepository.findAllByOrderByCreatedAtDesc());
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