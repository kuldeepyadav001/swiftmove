package com.swiftmove.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "fare_logs")
public class FareLog {

    @Id
    private String id;

    private String bookingId;       // linked booking if confirmed
    private String userId;          // who requested the estimate

    // Inputs
    private String pickup;
    private String drop;
    private String city;
    private String vehicleType;
    private double distanceKm;
    private int    waitingMins;

    // Calculation breakdown
    private double baseFare;
    private double distanceCharge;
    private double waitingCharge;
    private double surgeMultiplier;
    private String surgeReason;
    private double subtotal;
    private double totalFareRounded;
    private double platformCommission;
    private double driverPayout;
    private double commissionPct;

    // Source
    private boolean orsApiUsed;     // true = real road distance, false = haversine estimate

    private LocalDateTime calculatedAt;
}
