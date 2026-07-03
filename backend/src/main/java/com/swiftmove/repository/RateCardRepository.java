package com.swiftmove.repository;


import com.swiftmove.model.RateCard;
import org.springframework.data.mongodb.repository.MongoRepository;


import java.util.List;
import java.util.Optional;


public interface RateCardRepository extends MongoRepository<RateCard, String> {
    Optional<RateCard> findByCityAndVehicleTypeAndActiveTrue(String city, String vehicleType);
    List<RateCard> findByCityOrderByVehicleType(String city);
    List<RateCard> findAllByOrderByCityAscVehicleTypeAsc();
}