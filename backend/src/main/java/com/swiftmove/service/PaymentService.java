package com.swiftmove.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.swiftmove.dto.PaymentDtos.*;
import com.swiftmove.model.Payment;
import com.swiftmove.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

    
    // razorpay.key.id=rzp_test_XXXXXXXXXXXXXXXX
    // razorpay.key.secret=XXXXXXXXXXXXXXXXXXXXXXXX
   @Value("${razorpay.key.id:NOT_SET}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:NOT_SET}")
    private String razorpayKeySecret;

    // ── Create Razorpay order (prepaid flow) ──────────────────────────────────
    public OrderResponse createOrder(CreateOrderRequest req, String userId, String userEmail)
            throws RazorpayException {

        if (!isRazorpayReady()) {
            throw new RuntimeException(
                "Razorpay keys not configured. Add razorpay.key.id and razorpay.key.secret to application.properties");
        }

        long amountInPaise = req.getAmount() * 100; // convert ₹ to paise

        // Create order on Razorpay
        RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount",   amountInPaise);
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt",  req.getBookingId());
        orderRequest.put("notes",    new JSONObject()
            .put("booking_id",  req.getBookingId())
            .put("user_email",  userEmail)
        );

        Order order = client.orders.create(orderRequest);
        String razorpayOrderId = order.get("id");

        // Save to MongoDB
        paymentRepository.save(Payment.builder()
            .bookingId(req.getBookingId())
            .userId(userId)
            .userEmail(userEmail)
            .razorpayOrderId(razorpayOrderId)
            .amount(amountInPaise)
            .currency("INR")
            .method(req.getMethod())
            .status("CREATED")
            .paymentType("PREPAID")
            .receipt(req.getBookingId())
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build());

        log.info("Razorpay order created: {} for booking: {}", razorpayOrderId, req.getBookingId());

        return OrderResponse.builder()
            .razorpayOrderId(razorpayOrderId)
            .amount(amountInPaise)
            .currency("INR")
            .keyId(razorpayKeyId)
            .bookingId(req.getBookingId())
            .receipt(req.getBookingId())
            .build();
    }

    // ── Verify payment signature after Razorpay callback ─────────────────────
    public PaymentStatusResponse verifyPayment(VerifyRequest req) {

        // Verify signature to prevent fraud
        // Razorpay signature = HMAC-SHA256(orderId + "|" + paymentId, keySecret)
        String generated = generateSignature(
            req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId(),
            razorpayKeySecret
        );

        if (!generated.equals(req.getRazorpaySignature())) {
            log.warn("Payment signature mismatch for booking: {}", req.getBookingId());
            throw new RuntimeException("Payment verification failed. Invalid signature.");
        }

        // Update payment record
        Payment payment = paymentRepository
            .findByRazorpayOrderId(req.getRazorpayOrderId())
            .orElseThrow(() -> new RuntimeException("Payment record not found"));

        payment.setRazorpayPaymentId(req.getRazorpayPaymentId());
        payment.setRazorpaySignature(req.getRazorpaySignature());
        payment.setStatus("PAID");
        payment.setPaidAt(LocalDateTime.now());
        payment.setUpdatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        log.info("Payment verified: {} for booking: {}",
            req.getRazorpayPaymentId(), req.getBookingId());

        return PaymentStatusResponse.builder()
            .status("PAID")
            .method(payment.getMethod())
            .paymentType("PREPAID")
            .amount(payment.getAmount() / 100)
            .razorpayPaymentId(req.getRazorpayPaymentId())
            .bookingId(req.getBookingId())
            .success(true)
            .message("Payment successful!")
            .build();
    }

    // ── COD — record intent, collect on delivery ──────────────────────────────
    public PaymentStatusResponse createCod(CodRequest req, String userId, String userEmail) {

        paymentRepository.save(Payment.builder()
            .bookingId(req.getBookingId())
            .userId(userId)
            .userEmail(userEmail)
            .amount(req.getAmount() * 100)
            .currency("INR")
            .method("cod")
            .status("COD_PENDING")
            .paymentType("COD")
            .receipt(req.getBookingId())
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build());

        log.info("COD recorded for booking: {}", req.getBookingId());

        return PaymentStatusResponse.builder()
            .status("COD_PENDING")
            .method("cod")
            .paymentType("COD")
            .amount(req.getAmount())
            .bookingId(req.getBookingId())
            .success(true)
            .message("Cash on delivery confirmed. Pay ₹" +
                     String.format("%,d", req.getAmount()) + " to the driver.")
            .build();
    }

    // ── Mark COD as collected (driver calls this after delivery) ─────────────
    public PaymentStatusResponse markCodCollected(String bookingId) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
            .orElseThrow(() -> new RuntimeException("Payment not found"));
        payment.setStatus("PAID");
        payment.setPaidAt(LocalDateTime.now());
        payment.setUpdatedAt(LocalDateTime.now());
        paymentRepository.save(payment);
        return PaymentStatusResponse.builder()
            .status("PAID").method("cod").success(true)
            .message("COD collected successfully").bookingId(bookingId)
            .build();
    }

    // ── Get payment status for a booking ─────────────────────────────────────
    public PaymentStatusResponse getStatus(String bookingId) {
        return paymentRepository.findByBookingId(bookingId)
            .map(p -> PaymentStatusResponse.builder()
                .status(p.getStatus())
                .method(p.getMethod())
                .paymentType(p.getPaymentType())
                .amount(p.getAmount() / 100)
                .razorpayPaymentId(p.getRazorpayPaymentId())
                .bookingId(bookingId)
                .success("PAID".equals(p.getStatus()))
                .message(statusMessage(p.getStatus()))
                .build())
            .orElse(PaymentStatusResponse.builder()
                .status("NOT_PAID").success(false)
                .message("No payment found").bookingId(bookingId).build());
    }

    public boolean isRazorpayReady() {
        return razorpayKeyId != null && !razorpayKeyId.equals("NOT_SET")
            && razorpayKeySecret != null && !razorpayKeySecret.equals("NOT_SET");
    }

    // ── HMAC-SHA256 signature ─────────────────────────────────────────────────
    private String generateSignature(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Signature generation failed", e);
        }
    }

    private String statusMessage(String status) {
        return switch (status) {
            case "PAID"        -> "Payment completed";
            case "COD_PENDING" -> "Cash on delivery — pay to driver";
            case "CREATED"     -> "Payment pending";
            case "FAILED"      -> "Payment failed";
            case "REFUNDED"    -> "Payment refunded";
            default            -> status;
        };
    }
}
