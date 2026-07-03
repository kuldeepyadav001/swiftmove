package com.swiftmove.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "rate_cards")
@CompoundIndex(def = "{'city': 1, 'vehicleType': 1}", unique = true)
public class RateCard {

    @Id
    private String id;

    private String city;           // "kanpur" | "delhi" | "mumbai" etc.
    private String vehicleType;    // "bike" | "three-wheeler" | "tata-ace" | "pickup" | "large-truck"
    private String vehicleLabel;   // "Bike (2-Wheeler)"
    private String capacity;       // "Up to 20 kg"

    // Base fare covers first includedDistanceKm + includedWaitingMins
    private double baseFare;              // ₹60
    private double includedDistanceKm;   // 1.0 km
    private int    includedWaitingMins;  // 25 mins

    // Variable charges after included amounts
    private double perKmRate;            // ₹25/km after 1km
    private double perMinWaitingRate;    // ₹1.5/min after 25 mins

    // Platform commission (configurable)
    private double commissionPct;        // 0.16 = 16%

    // Surge rules
    private double peakHourMultiplier;   // 1.2
    private double weekendMultiplier;    // 1.15
    private double rainMultiplier;       // 1.3

    private boolean active;
    private LocalDateTime updatedAt;

    // ── Default rate cards for Indian cities ─────────────────────────────────
    public static RateCard defaultBike(String city) {
        return RateCard.builder()
            .city(city).vehicleType("bike").vehicleLabel("Bike (2-Wheeler)")
            .capacity("Up to 20 kg")
            .baseFare(60).includedDistanceKm(1.0).includedWaitingMins(25)
            .perKmRate(25).perMinWaitingRate(1.5)
            .commissionPct(0.16).peakHourMultiplier(1.2)
            .weekendMultiplier(1.15).rainMultiplier(1.3)
            .active(true).updatedAt(LocalDateTime.now()).build();
    }

    public static RateCard defaultThreeWheeler(String city) {
        return RateCard.builder()
            .city(city).vehicleType("three-wheeler").vehicleLabel("Three Wheeler")
            .capacity("500-750 kg")
            .baseFare(200).includedDistanceKm(1.0).includedWaitingMins(25)
            .perKmRate(30).perMinWaitingRate(2.0)
            .commissionPct(0.16).peakHourMultiplier(1.2)
            .weekendMultiplier(1.15).rainMultiplier(1.3)
            .active(true).updatedAt(LocalDateTime.now()).build();
    }

    public static RateCard defaultTataAce(String city) {
        return RateCard.builder()
            .city(city).vehicleType("tata-ace").vehicleLabel("Tata Ace / Mini Truck")
            .capacity("750-1000 kg")
            .baseFare(320).includedDistanceKm(1.0).includedWaitingMins(25)
            .perKmRate(38).perMinWaitingRate(2.5)
            .commissionPct(0.16).peakHourMultiplier(1.2)
            .weekendMultiplier(1.15).rainMultiplier(1.3)
            .active(true).updatedAt(LocalDateTime.now()).build();
    }

    public static RateCard defaultPickup(String city) {
        return RateCard.builder()
            .city(city).vehicleType("pickup").vehicleLabel("Pickup Truck (8ft)")
            .capacity("Up to 1250 kg")
            .baseFare(400).includedDistanceKm(1.0).includedWaitingMins(25)
            .perKmRate(48).perMinWaitingRate(3.0)
            .commissionPct(0.16).peakHourMultiplier(1.2)
            .weekendMultiplier(1.15).rainMultiplier(1.3)
            .active(true).updatedAt(LocalDateTime.now()).build();
    }

    public static RateCard defaultLargeTruck(String city) {
        return RateCard.builder()
            .city(city).vehicleType("large-truck").vehicleLabel("Large Truck (18ft)")
            .capacity("2000+ kg")
            .baseFare(700).includedDistanceKm(1.0).includedWaitingMins(25)
            .perKmRate(65).perMinWaitingRate(4.0)
            .commissionPct(0.16).peakHourMultiplier(1.2)
            .weekendMultiplier(1.15).rainMultiplier(1.3)
            .active(true).updatedAt(LocalDateTime.now()).build();
    }
}
