package com.aminuiliyasu.ecommerce.order.repository;

import com.aminuiliyasu.ecommerce.order.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    Optional<Coupon> findByCode(String code);
}
