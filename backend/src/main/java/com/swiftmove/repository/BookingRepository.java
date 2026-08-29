package com.swiftmove.repository;

import com.swiftmove.model.Booking;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

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

    // ── Aggregation: sum appCut for delivered bookings ──
    // Runs entirely on MongoDB — no Java-side iteration over all docs.
    @Aggregation(pipeline = {
        "{ $match: { status: ?0 } }",
        "{ $group: { _id: null, total: { $sum: '$appCut' } } }"
    })
    Long sumAppCutByStatus(String status);

    // ── Aggregation: sum driverCut for delivered bookings ──
    @Aggregation(pipeline = {
        "{ $match: { status: ?0 } }",
        "{ $group: { _id: null, total: { $sum: '$driverCut' } } }"
    })
    Long sumDriverCutByStatus(String status);
}
