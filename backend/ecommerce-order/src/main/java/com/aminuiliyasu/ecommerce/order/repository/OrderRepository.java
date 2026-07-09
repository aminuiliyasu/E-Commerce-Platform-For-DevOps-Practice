package com.aminuiliyasu.ecommerce.order.repository;

import com.aminuiliyasu.ecommerce.order.entity.Order;
import com.aminuiliyasu.ecommerce.order.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByUserId(Long userId, Pageable pageable);
    Optional<Order> findByIdAndUserId(Long id, Long userId);
    Optional<Order> findByOrderNumber(String orderNumber);
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status NOT IN ('CANCELLED', 'REFUNDED')")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :since")
    long countSince(Instant since);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.createdAt >= :since AND o.status NOT IN ('CANCELLED', 'REFUNDED')")
    BigDecimal sumRevenueSince(Instant since);
}
