package com.swiftmove.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationMessage {

    private String bookingId;    // which booking this update belongs to
    private String driverId;     // driver sending the update
    private String driverName;
    private double latitude;
    private double longitude;
    private double speed;        // km/h
    private String status;       // "en_route" | "arrived" | "delivered"
    private long timestamp;

    // Factory method — driver sends this, server broadcasts it
    public static LocationMessage of(
            String bookingId, String driverId, String driverName,
            double lat, double lng, double speed, String status) {
        return new LocationMessage(
                bookingId, driverId, driverName,
                lat, lng, speed, status,
                System.currentTimeMillis()
        );
    }
}
