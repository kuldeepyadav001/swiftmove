package com.swiftmove.controller;

import com.swiftmove.model.Notification;
import com.swiftmove.model.User;
import com.swiftmove.repository.UserRepository;
import com.swiftmove.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    // GET /api/notifications — get all notifications for current user
    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications() {
        String userId = getCurrentUserId();
        return ResponseEntity.ok(notificationService.getForUser(userId));
    }

    // GET /api/notifications/unread-count
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        String userId = getCurrentUserId();
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    // PUT /api/notifications/mark-all-read
    @PutMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllRead() {
        String userId = getCurrentUserId();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    // PUT /api/notifications/{id}/read
    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markOneRead(@PathVariable String id) {
        notificationService.markOneRead(id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
