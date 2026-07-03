package com.swiftmove.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class FareDtos {

    // ── Request ───────────────────────────────────────────────────────────────
    @Data
    public static class FareRequest {
        private String pickup;         // "Kanpur"
        private String drop;           // "Delhi"
        private String city;           // "kanpur" (optional, auto-detected from pickup)
        private String vehicleType;    // "tata-ace"
        private int    estimatedWaitingMins; // default 0
    }

    // ── Full breakdown response ───────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FareResponse {
        // Route
        private String pickup;
        private String drop;
        private String city;
        private double distanceKm;
        private long   durationMins;
        private boolean orsApiUsed;

        // Vehicle
        private String vehicleType;
        private String vehicleLabel;
        private String capacity;

        // Fare breakdown
        private long baseFare;
        private long distanceCharge;   // 0 if within included km
        private long waitingCharge;    // 0 if within included mins
        private long subtotal;

        // Surge
        private boolean surgeApplied;
        private double  surgeMultiplier;
        private String  surgeReason;
        private long    surgeCharge;

        // Final
        private long totalFare;        // rounded to nearest ₹5
        private long platformCommission;
        private long driverPayout;
        private double commissionPct;

        // Human readable
        private String breakdown;

        // Included amounts (for display)
        private double includedDistanceKm;
        private int    includedWaitingMins;
        private double perKmRate;
        private double perMinWaitingRate;
    }

    // ── Rate card update request (admin) ──────────────────────────────────────
    @Data
    public static class RateCardUpdateRequest {
        private double baseFare;
        private double perKmRate;
        private double perMinWaitingRate;
        private double commissionPct;
        private double peakHourMultiplier;
        private double weekendMultiplier;
        private double includedDistanceKm;
        private int    includedWaitingMins;
    }
}
