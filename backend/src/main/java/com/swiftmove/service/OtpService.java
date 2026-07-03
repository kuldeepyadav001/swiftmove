package com.swiftmove.service;

import com.swiftmove.model.OtpToken;
import com.swiftmove.model.User;
import com.swiftmove.repository.OtpRepository;
import com.swiftmove.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpRepository   otpRepository;
    private final UserRepository  userRepository;
    private final EmailService    emailService;
    private final PasswordEncoder passwordEncoder;

    private static final SecureRandom RANDOM = new SecureRandom();

    // ── Step 1: Request OTP ───────────────────────────────────────────────────
    public Map<String, String> requestOtp(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException(
                    "No account found with this email address."));

        // Delete any existing OTPs for this email
        otpRepository.deleteAllByEmail(email);

        // Generate 6-digit OTP
        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));

        // Save to MongoDB
        otpRepository.save(OtpToken.create(email, otp));

        // Send email
        emailService.sendOtp(email, user.getName(), otp);

        log.info("OTP sent to {}", email);

        return Map.of(
            "message", "OTP sent to " + maskEmail(email),
            "email",   email
        );
    }

    // ── Step 2: Verify OTP ────────────────────────────────────────────────────
    public Map<String, String> verifyOtp(String email, String otp) {

        OtpToken token = otpRepository
                .findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new RuntimeException(
                    "No OTP found. Please request a new one."));

        if (token.isExpired()) {
            otpRepository.deleteAllByEmail(email);
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }

        if (!token.getOtp().equals(otp)) {
            throw new RuntimeException("Incorrect OTP. Please try again.");
        }

        // Mark as used
        token.setUsed(true);
        otpRepository.save(token);

        return Map.of(
            "message", "OTP verified successfully",
            "email",   email
        );
    }

    // ── Step 3: Reset password ────────────────────────────────────────────────
    public Map<String, String> resetPassword(String email, String otp, String newPassword) {

        // Verify OTP first
        verifyOtp(email, otp);

        // Validate password
        if (newPassword == null || newPassword.length() < 8) {
            throw new RuntimeException("Password must be at least 8 characters.");
        }

        // Update password
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Clean up OTPs
        otpRepository.deleteAllByEmail(email);

        log.info("Password reset for {}", email);

        return Map.of("message", "Password reset successfully. You can now log in.");
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private String maskEmail(String email) {
        String[] parts = email.split("@");
        if (parts.length != 2) return email;
        String name = parts[0];
        String domain = parts[1];
        String masked = name.charAt(0) +
                "*".repeat(Math.max(0, name.length() - 2)) +
                (name.length() > 1 ? String.valueOf(name.charAt(name.length()-1)) : "");
        return masked + "@" + domain;
    }
}
