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
@Document(collection = "otp_tokens")
public class OtpToken {

    @Id
    private String id;

    @Indexed
    private String email;

    private String otp;           // 6-digit code

    private boolean used;

    private LocalDateTime expiresAt;   // 10 minutes from creation
    private LocalDateTime createdAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public static OtpToken create(String email, String otp) {
        return OtpToken.builder()
                .email(email)
                .otp(otp)
                .used(false)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
    }
}
