package com.swiftmove.controller;

import com.swiftmove.dto.AuthDtos.AuthResponse;
import com.swiftmove.dto.AuthDtos.LoginRequest;
import com.swiftmove.dto.AuthDtos.RegisterRequest;
import com.swiftmove.service.AuthService;
import com.swiftmove.service.OtpService;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService  otpService;

    // ── Register ──────────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    // ── Forgot password: Step 1 — request OTP ────────────────────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        return ResponseEntity.ok(otpService.requestOtp(email));
    }

    // ── Forgot password: Step 2 — verify OTP ─────────────────────────────────
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            otpService.verifyOtp(body.get("email"), body.get("otp")));
    }

    // ── Forgot password: Step 3 — reset password ─────────────────────────────
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            otpService.resetPassword(
                body.get("email"),
                body.get("otp"),
                body.get("newPassword")
            )
        );
    }
}
