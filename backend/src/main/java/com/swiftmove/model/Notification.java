package com.swiftmove.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    @Indexed
    private String recipientId;     // userId who receives this

    private String recipientEmail;

    private String type;            // BOOKING_CREATED | JOB_ACCEPTED | JOB_DELIVERED | NEW_JOB
    private String title;
    private String message;
    private String bookingId;       // related booking

    private boolean read;
    private LocalDateTime createdAt;

    public static Notification create(
            String recipientId, String recipientEmail,
            String type, String title, String message, String bookingId) {
        return Notification.builder()
                .recipientId(recipientId)
                .recipientEmail(recipientEmail)
                .type(type)
                .title(title)
                .message(message)
                .bookingId(bookingId)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
    }
}
