package com.swiftmove.repository;

import com.swiftmove.model.User;
import com.swiftmove.model.enums.Role;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;


public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    List<User> findAllByRole(Role role);
    long countByRole(Role role);
}
