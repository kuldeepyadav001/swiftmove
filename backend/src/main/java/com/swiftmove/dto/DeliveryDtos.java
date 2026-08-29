package com.swiftmove.dto;

import lombok.Data;

/**
 * DTOs for the delivery handoff flow. Replace Map<String, Object> / Map<String, String>
 * in BookingController so the API contract is explicit and type-safe.
 */
public class DeliveryDtos {

    @Data
    public static class RequestDeliveryRequest {
        private java.util.List<String> images;
    }

    @Data
    public static class VerifyOtpRequest {
        private String otp;
    }

    @Data
    public static class DisputeRequest {
        private String reason;
    }
}
