package com.swiftmove.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String id;
    private String name;
    private String email;
    private String role;       // "SHIPPER" or "DRIVER"
    private boolean kycVerified;
}
