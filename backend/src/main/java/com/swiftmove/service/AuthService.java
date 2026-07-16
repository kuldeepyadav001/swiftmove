package com.swiftmove.service;

import com.swiftmove.dto.AuthDtos.AuthResponse;
import com.swiftmove.dto.AuthDtos.LoginRequest;
import com.swiftmove.dto.AuthDtos.RegisterRequest;
import com.swiftmove.exception.SwiftMoveException;
import com.swiftmove.model.User;
import com.swiftmove.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository         userRepository;
    private final PasswordEncoder        passwordEncoder;
    private final JwtService             jwtService;
    private final AuthenticationManager  authenticationManager;
    private final UserDetailsService     userDetailsService;
    private final EmailService           emailService;   // ← added

    // ── Register ──────────────────────────────────────────────────────────────
    public AuthResponse register(RegisterRequest req) {

        if (userRepository.existsByEmail(req.getEmail()))
            throw new SwiftMoveException("Email already registered. Please log in.");
        if (userRepository.existsByPhone(req.getPhone()))
            throw new SwiftMoveException("Phone number already registered.");

        User savedUser = userRepository.save(User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(req.getRole())
                .verified(false)
                .active(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        // ✅ Send welcome email (async — won't block the response)
        emailService.sendWelcome(
            savedUser.getEmail(),
            savedUser.getName(),
            savedUser.getRole().name()
        );

        UserDetails ud = userDetailsService.loadUserByUsername(savedUser.getEmail());
        String token = jwtService.generateToken(ud, savedUser.getRole().name());

        return new AuthResponse(
            token, savedUser.getId(), savedUser.getName(),
            savedUser.getEmail(), savedUser.getRole().name()
        );
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    public AuthResponse login(LoginRequest req) {

        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );

        User user = userRepository.findByEmail(req.getEmail())
            .orElseThrow(() -> new SwiftMoveException("User not found."));

        // NOTE: we intentionally do NOT reject login based on a client-submitted
        // role anymore. The login form only exposes "Shipper" / "Driver" tabs,
        // but an admin account must still be able to log in through either one —
        // the actual role always comes from the database (below) and the
        // frontend routes to the correct dashboard (including the admin board)
        // based on that authoritative value, not on what the user clicked.

        UserDetails ud = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtService.generateToken(ud, user.getRole().name());

        return new AuthResponse(
            token, user.getId(), user.getName(),
            user.getEmail(), user.getRole().name()
        );
    }
}