package com.swiftmove.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class FareDtos {

    // ── Request ───────────────────────────────────────────────────────────────
    @Data
    public static class FareRequest {
        private String pickup;         // "Kanpur" or full address text
        private String drop;           // "Delhi" or full address text
        private String city;           // "kanpur" (optional, auto-detected from pickup)
        private String vehicleType;    // "tata-ace"
        private int    estimatedWaitingMins; // default 0

        // Optional precise coordinates from the map picker. When both are
        // present, DynamicFareService uses them directly instead of
        // re-geocoding the address text — more accurate for exact
        // house/gate-level pickup and drop points.
        private Double pickupLat;
        private Double pickupLng;
        private Double dropLat;
        private Double dropLng;
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