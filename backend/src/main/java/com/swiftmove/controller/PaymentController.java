package com.swiftmove.controller;

import com.swiftmove.dto.PaymentDtos.*;
import com.swiftmove.model.Payment;
import com.swiftmove.model.User;
import com.swiftmove.repository.PaymentRepository;
import com.swiftmove.repository.UserRepository;
import com.swiftmove.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService    paymentService;
    private final PaymentRepository paymentRepository;
    private final UserRepository    userRepository;

    // POST /api/payments/create-order — shipper initiates prepaid payment
    @PostMapping("/create-order")
    public ResponseEntity<OrderResponse> createOrder(
            @RequestBody CreateOrderRequest req) throws Exception {
        User user = getUser();
        return ResponseEntity.ok(
            paymentService.createOrder(req, user.getId(), user.getEmail()));
    }

    // POST /api/payments/verify — called after Razorpay popup succeeds
    @PostMapping("/verify")
    public ResponseEntity<PaymentStatusResponse> verify(
            @RequestBody VerifyRequest req) {
        return ResponseEntity.ok(paymentService.verifyPayment(req));
    }

    // POST /api/payments/cod — shipper chooses cash on delivery
    @PostMapping("/cod")
    public ResponseEntity<PaymentStatusResponse> cod(
            @RequestBody CodRequest req) {
        User user = getUser();
        return ResponseEntity.ok(
            paymentService.createCod(req, user.getId(), user.getEmail()));
    }

    // PUT /api/payments/{bookingId}/collect — driver marks COD collected
    @PutMapping("/{bookingId}/collect")
    public ResponseEntity<PaymentStatusResponse> collect(
            @PathVariable String bookingId) {
        return ResponseEntity.ok(paymentService.markCodCollected(bookingId));
    }

    // GET /api/payments/{bookingId}/status — get payment status
    @GetMapping("/{bookingId}/status")
    public ResponseEntity<PaymentStatusResponse> status(
            @PathVariable String bookingId) {
        return ResponseEntity.ok(paymentService.getStatus(bookingId));
    }

    // GET /api/payments/my — user's payment history
    @GetMapping("/my")
    public ResponseEntity<List<Payment>> myPayments() {
        User user = getUser();
        return ResponseEntity.ok(
            paymentRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    // GET /api/admin/payments — admin sees all payments
    @GetMapping("/admin/all")
    public ResponseEntity<List<Payment>> allPayments() {
        return ResponseEntity.ok(
            paymentRepository.findAllByOrderByCreatedAtDesc());
    }

    // GET /api/payments/razorpay-ready — check if keys are configured
    @GetMapping("/razorpay-ready")
    public ResponseEntity<Map<String, Boolean>> razorpayReady() {
        return ResponseEntity.ok(
            Map.of("ready", paymentService.isRazorpayReady()));
    }

    private User getUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
