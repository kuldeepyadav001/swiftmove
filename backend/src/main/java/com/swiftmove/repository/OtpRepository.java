package com.swiftmove.repository;

import com.swiftmove.model.OtpToken;
import org.springframework.data.mongodb.repository.MongoRepository;


import java.util.Optional;


public interface OtpRepository extends MongoRepository<OtpToken, String> {

    // Get latest unused OTP for an email
    Optional<OtpToken> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    // Delete all OTPs for an email (cleanup after use)
    void deleteAllByEmail(String email);
}
