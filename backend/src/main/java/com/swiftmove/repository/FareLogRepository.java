package com.swiftmove.repository;

import com.swiftmove.model.FareLog;

import org.springframework.data.mongodb.repository.MongoRepository;


import java.util.List;


public interface FareLogRepository extends MongoRepository<FareLog, String> {
    List<FareLog> findByUserIdOrderByCalculatedAtDesc(String userId);
    List<FareLog> findAllByOrderByCalculatedAtDesc();
}
