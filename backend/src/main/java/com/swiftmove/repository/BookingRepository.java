package com.swiftmove.repository;

import com.swiftmove.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;


import java.util.List;


public interface BookingRepository extends MongoRepository<Booking, String> {

    // Shipper's bookings
    List<Booking> findByShipperUserIdOrderByCreatedAtDesc(String shipperUserId);

    // Driver's bookings
    List<Booking> findByDriverUserIdOrderByCreatedAtDesc(String driverUserId);

    // All pending jobs (for driver feed)
    List<Booking> findByStatusOrderByCreatedAtDesc(String status);

    // Admin — all bookings
    List<Booking> findAllByOrderByCreatedAtDesc();

    // Counts
    long countByStatus(String status);
    long countByShipperUserId(String shipperUserId);
    long countByDriverUserId(String driverUserId);
}
