package com.swiftmove.repository;

import com.swiftmove.model.Booking;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, String> {

    // Shipper's bookings (paginated)
    Page<Booking> findByShipperUserIdOrderByCreatedAtDesc(String shipperUserId, Pageable pageable);
    List<Booking> findByShipperUserIdOrderByCreatedAtDesc(String shipperUserId);

    // Driver's bookings (paginated)
    Page<Booking> findByDriverUserIdOrderByCreatedAtDesc(String driverUserId, Pageable pageable);
    List<Booking> findByDriverUserIdOrderByCreatedAtDesc(String driverUserId);

    // Pending jobs (paginated — prevents unbounded list at scale)
    Page<Booking> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    List<Booking> findByStatusOrderByCreatedAtDesc(String status);

    // Admin — all bookings (paginated)
    Page<Booking> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Booking> findAllByOrderByCreatedAtDesc();

    // Counts
    long countByStatus(String status);
    long countByShipperUserId(String shipperUserId);
    long countByDriverUserId(String driverUserId);

    // ── Aggregation: sum appCut for delivered bookings ──
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
