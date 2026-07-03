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
@Document(collection = "kyc_documents")
public class KycDocument {

    @Id
    private String id;

    @Indexed(unique = true)
    private String driverId;       // User.id
    private String driverEmail;
    private String driverName;

    // Personal details
    private String aadharNumber;   // masked in responses
    private String panNumber;
    private String licenseNumber;
    private String vehicleNumber;
    private String vehicleType;    // tata-ace | mini | etc.

    // Document images stored as Base64
    // Format: "data:image/jpeg;base64,/9j/4AAQ..."
    private String aadharFrontImage;
    private String aadharBackImage;
    private String panImage;
    private String licenseImage;
    private String vehicleRcImage;
    private String selfieImage;

    // Status
    private String status;         // PENDING | APPROVED | REJECTED | RESUBMIT
    private String rejectionReason;
    private String adminNote;

    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private LocalDateTime updatedAt;
}
