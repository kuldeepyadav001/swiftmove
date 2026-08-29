package com.swiftmove.dto;

import lombok.Data;

/**
 * Strongly-typed booking creation request. Replaces the old Map<String, Object>
 * approach — no more unchecked casts, and the field names are explicit so both
 * the API contract and the frontend payload are self-documenting.
 *
 * Note: we intentionally do NOT use @Valid/@NotNull here because many fields
 * are optional (coordinates, weight, goodsType) depending on the booking flow.
 * Required fields (pickup, drop, vehicleType) are checked in BookingService.
 */
@Data
public class BookingRequest {
    private String pickup;
    private String drop;
    private String vehicleType;
    private String vehicleLabel;
    private String goodsType;
    private String weight;
    private String pickupType;   // "now" | "scheduled"

    // Precise coordinates from the map picker (nullable)
    private Double pickupLat;
    private Double pickupLng;
    private Double dropLat;
    private Double dropLng;

    // Waiting time estimate (default 0)
    private int estimatedWaitingMins;
}
