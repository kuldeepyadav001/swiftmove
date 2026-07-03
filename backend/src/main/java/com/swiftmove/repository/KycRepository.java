package com.swiftmove.repository;

import com.swiftmove.model.KycDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface KycRepository extends MongoRepository<KycDocument, String> {

    Optional<KycDocument> findByDriverId(String driverId);

    List<KycDocument> findByStatusOrderBySubmittedAtDesc(String status);

    List<KycDocument> findAllByOrderBySubmittedAtDesc();

    long countByStatus(String status);
}
