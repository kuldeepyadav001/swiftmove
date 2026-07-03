package com.swiftmove.controller;

import com.swiftmove.model.Booking;
import com.swiftmove.model.User;
import com.swiftmove.model.enums.Role;
import com.swiftmove.repository.BookingRepository;
import com.swiftmove.repository.UserRepository;
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

        // Total revenue = sum of all delivered booking fares
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
}
