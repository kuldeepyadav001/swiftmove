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
@Document(collection = "payments")
public class Payment {

    @Id
    private String id;

    @Indexed
    private String bookingId;

    private String userId;
    private String userEmail;

    // Razorpay fields
    private String razorpayOrderId;    // order_XXXX — created by backend
    private String razorpayPaymentId;  // pay_XXXX  — returned after payment
    private String razorpaySignature;  // for verification

    // Payment details
    private long   amount;             // in paise (₹1 = 100 paise)
    private String currency;           // "INR"
    private String method;             // "upi" | "card" | "cod"
    private String status;             // CREATED | PAID | FAILED | REFUNDED | COD_PENDING

    private String paymentType;        // "PREPAID" | "COD"
    private String receipt;            // booking ID as receipt

    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private LocalDateTime updatedAt;
}
