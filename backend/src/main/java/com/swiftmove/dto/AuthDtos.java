package com.swiftmove.dto;

import com.swiftmove.model.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDtos {

    @Data
public static class RegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @Email
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Phone is required")
    private String phone;

    @Size(min = 8, message = "Password must be at least 8 characters")
    @NotBlank(message = "Password is required")
    private String password;

    private Role role;

    // clean phone before use
    public String getPhone() {
        return phone == null ? null : phone.replaceAll("[\\s+\\-()]", "");
    }
}

    @Data
    public static class LoginRequest {
        @Email @NotBlank
        private String email;
        @NotBlank
        private String password;
        private Role role;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private String id;
        private String name;
        private String email;
        private String role;
        private String message;

        public AuthResponse(String token, String id, String name, String email, String role) {
            this.token = token; this.id = id; this.name = name;
            this.email = email; this.role = role; this.message = "Success";
        }
    }
}
