package com.swiftmove.controller;

import com.swiftmove.dto.UpdateProfileRequest;
import com.swiftmove.model.User;
import com.swiftmove.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    // GET /api/user/profile — get current user's profile
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        String email = getCurrentUserEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(Map.of(
                "id",      user.getId(),
                "name",    user.getName(),
                "email",   user.getEmail(),
                "phone",   user.getPhone() != null ? user.getPhone() : "",
                "role",    user.getRole().name(),
                "verified",user.isVerified(),
                "active",  user.isActive()
        ));
    }

    // PUT /api/user/profile — update name and phone
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
        String email = getCurrentUserEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (req.getName() != null && !req.getName().isBlank()) {
            user.setName(req.getName());
        }
        if (req.getPhone() != null && !req.getPhone().isBlank()) {
            user.setPhone(req.getPhone().replaceAll("\\D", ""));
        }
        user.setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Profile updated successfully",
                "name",    user.getName(),
                "phone",   user.getPhone()
        ));
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
