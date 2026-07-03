package com.swiftmove.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class PaymentDtos {

    // ── Create Razorpay order (prepaid) ───────────────────────────────────────
    @Data
    public static class CreateOrderRequest {
        private String bookingId;
        private long   amount;      // in rupees — backend converts to paise
        private String method;      // "upi" | "card"
    }

    // ── Razorpay order response to frontend ───────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderResponse {
        private String razorpayOrderId;
        private long   amount;          // in paise
        private String currency;
        private String keyId;           // Razorpay key_id (public)
        private String bookingId;
        private String receipt;
    }

    // ── Verify payment after Razorpay callback ────────────────────────────────
    @Data
    public static class VerifyRequest {
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private String razorpaySignature;
        private String bookingId;
    }

    // ── COD confirmation ──────────────────────────────────────────────────────
    @Data
    public static class CodRequest {
        private String bookingId;
        private long   amount;
    }

    // ── Payment status response ───────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentStatusResponse {
        private String  status;
        private String  method;
        private String  paymentType;
        private long    amount;
        private String  razorpayPaymentId;
        private String  bookingId;
        private boolean success;
        private String  message;
    }
}
