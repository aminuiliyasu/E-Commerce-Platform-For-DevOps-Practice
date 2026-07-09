package com.aminuiliyasu.ecommerce.user.repository;

import com.aminuiliyasu.ecommerce.user.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAddressRepository extends JpaRepository<UserAddress, Long> {
    List<UserAddress> findByUserId(Long userId);
    Optional<UserAddress> findByIdAndUserId(Long id, Long userId);
}
