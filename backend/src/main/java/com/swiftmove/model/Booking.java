package com.swiftmove.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.Transient;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Represents a logistics booking in the SwiftMove system.
 * Status Flow: PENDING -> ASSIGNED -> IN_TRANSIT -> DELIVERED_PENDING_CONFIRMATION -> DELIVERED
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "bookings")
public class Booking {
    @Id
    private String id;

    // --- Shipper (Customer) Details ---
    @Indexed
    private String shipperUserId;
    private String shipperName;
    private String shipperEmail;

    // --- Driver Details (Populated after acceptance) ---
    @Indexed
    private String driverUserId;
    private String driverName;
    private String driverEmail;
    private String driverPhone;   // Added for shipper-driver contact

    // --- Route & Shipment Info ---
    private String pickup;
    private String drop;
    private String goodsType;
    private String weight;

    // --- Precise coordinates (house/gate-level pin, not just city) ---
    // Captured by the frontend LocationPicker (map pin + search), used for
    // accurate ORS routing and to plot exact markers on TrackingMap.
    private Double pickupLat;
    private Double pickupLng;
    private Double dropLat;
    private Double dropLng;

    // --- Vehicle Details ---
    private String vehicleType;   // e.g., tata-ace, bike, etc.
    private String vehicleLabel;  // Display name for UI

    // --- Pricing & Financials ---
    private double distanceKm;
    private long   totalFare;     // Amount paid by shipper
    private long   driverCut;     // Amount earned by driver
    private long   appCut;        // Commission kept by SwiftMove
    private double commissionPct;
    private String fareBreakdown; // JSON/String detail of fare calculation

    // --- Status & Lifecycle ---
    private String pickupType;    // now | scheduled
    // Statuses: PENDING, ASSIGNED, IN_TRANSIT, DELIVERED_PENDING_CONFIRMATION, DELIVERED, CANCELLED, DISPUTED
    @Indexed
    private String status;      

    // --- NEW: Delivery Verification & OTP Handoff ---
    
    // Mandatory photos uploaded by driver at the drop-off location
    private List<String> driverProofImages; 

    // The 6-digit code sent to the shipper to confirm delivery
    private String deliveryOtp;

    // Expiry timestamp (Set to 30 minutes after generation)
    private LocalDateTime deliveryOtpExpiry;

    // Tracker for resend requests (Capped at 3)
    private int deliveryOtpResendCount;

    // Reason provided if the booking is moved to DISPUTED status
    private String disputeReason;

    // Shipper's rating of the driver (1-5 stars, set after delivery)
    private Integer shipperRating;

    // --- Timestamps ---
    private LocalDateTime createdAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime deliveredAt; // Set only after successful OTP verification
    private LocalDateTime updatedAt;
  
    @Transient
    private Boolean otpEmailSent;
}