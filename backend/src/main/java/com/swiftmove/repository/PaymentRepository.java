package com.swiftmove.repository;

import com.swiftmove.model.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;


import java.util.List;
import java.util.Optional;


public interface PaymentRepository extends MongoRepository<Payment, String> {

    Optional<Payment> findByBookingId(String bookingId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    List<Payment> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Payment> findAllByOrderByCreatedAtDesc();
    long countByStatus(String status);
}
