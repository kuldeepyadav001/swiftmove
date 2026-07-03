package com.swiftmove.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class LocationController {

    private final SimpMessagingTemplate messaging;

    public LocationController(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    /**
     * Driver sends location → /app/location
     * Server broadcasts to   → /topic/booking/{bookingId}
     *
     * Expected payload from driver:
     * {
     *   "type":      "location",
     *   "bookingId": "BK-123",
     *   "driverId":  "...",
     *   "driverName":"...",
     *   "latitude":  28.6139,
     *   "longitude": 77.2090,
     *   "speed":     60,
     *   "status":    "en_route"
     * }
     */
    @MessageMapping("/location")
    public void handleLocation(@Payload Map<String, Object> payload) {
        String bookingId = (String) payload.get("bookingId");
        if (bookingId == null || bookingId.isBlank()) return;

        // Ensure the type field is always present so the frontend can distinguish
        payload.put("type", "location");

        messaging.convertAndSend("/topic/booking/" + bookingId, (Object) payload);
    }

    /**
     * Call this from your BookingService when a driver accepts a job.
     *
     * Sends to /topic/booking/{bookingId}:
     * {
     *   "type":       "status_update",
     *   "status":     "ASSIGNED",
     *   "driverId":   "...",
     *   "driverName": "..."
     * }
     *
     * Usage in BookingService:
     *   locationController.notifyStatusUpdate(booking.getId(), "ASSIGNED",
     *                                          driver.getId(), driver.getName());
     */
    public void notifyStatusUpdate(String bookingId, String status,
                                   String driverId, String driverName) {
        Map<String, Object> msg = Map.of(
            "type",       "status_update",
            "status",     status,
            "driverId",   driverId != null ? driverId : "",
            "driverName", driverName != null ? driverName : ""
        );
        messaging.convertAndSend("/topic/booking/" + bookingId, (Object) msg);
    }

    /**
     * Call this from BookingService.createBooking() so online drivers
     * see new jobs in real-time without polling.
     *
     * Broadcasts the full booking payload to /topic/jobs/new
     */
    public void notifyNewJob(Object bookingPayload) {
        messaging.convertAndSend("/topic/jobs/new", bookingPayload);
    }
}
