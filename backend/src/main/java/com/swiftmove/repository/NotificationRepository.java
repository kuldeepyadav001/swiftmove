package com.swiftmove.repository;

import com.swiftmove.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;


import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    // Get all notifications for a user, newest first
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(String recipientId);

    // Get unread count
    long countByRecipientIdAndReadFalse(String recipientId);

    // Get unread notifications only
    List<Notification> findByRecipientIdAndReadFalseOrderByCreatedAtDesc(String recipientId);
}
