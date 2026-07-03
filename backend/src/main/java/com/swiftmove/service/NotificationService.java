package com.swiftmove.service;

import com.swiftmove.model.Notification;
import com.swiftmove.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ── Create and push a notification ───────────────────────────────────
    public Notification send(
            String recipientId, String recipientEmail,
            String type, String title, String message, String bookingId) {

        // Save to MongoDB
        Notification notif = Notification.create(
                recipientId, recipientEmail, type, title, message, bookingId);
        notificationRepository.save(notif);

        // Push via WebSocket to the specific user
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + recipientId, notif);

        return notif;
    }

    // ── Convenience methods for each event type ───────────────────────────

    // When shipper books → notify nearby drivers (broadcast)
    public void notifyNewJob(String bookingId, String pickup, String drop, String fare) {
        // Broadcast to all drivers listening
        Notification notif = Notification.create(
                "all_drivers", "all",
                "NEW_JOB",
                "New job available",
                pickup + " → " + drop + " · " + fare,
                bookingId
        );
        messagingTemplate.convertAndSend("/topic/notifications/drivers", notif);
    }

    // When driver accepts → notify shipper
    public void notifyJobAccepted(
            String shipperUserId, String shipperEmail,
            String driverName, String bookingId) {
        send(shipperUserId, shipperEmail,
                "JOB_ACCEPTED",
                "Driver assigned!",
                driverName + " has accepted your booking " + bookingId,
                bookingId);
    }

    // When driver delivers → notify shipper
    public void notifyJobDelivered(
            String shipperUserId, String shipperEmail,
            String bookingId) {
        send(shipperUserId, shipperEmail,
                "JOB_DELIVERED",
                "Delivery completed!",
                "Your shipment " + bookingId + " has been delivered successfully.",
                bookingId);
    }

    // When shipper cancels → notify driver
    public void notifyJobCancelled(
            String driverUserId, String driverEmail,
            String bookingId) {
        send(driverUserId, driverEmail,
                "JOB_CANCELLED",
                "Booking cancelled",
                "Booking " + bookingId + " was cancelled by the shipper.",
                bookingId);
    }

    // ── REST helpers ──────────────────────────────────────────────────────

    public List<Notification> getForUser(String userId) {
        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByRecipientIdAndReadFalse(userId);
    }

    public void markAllRead(String userId) {
        List<Notification> unread = notificationRepository
                .findByRecipientIdAndReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    public void markOneRead(String notifId) {
        notificationRepository.findById(notifId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }
}
