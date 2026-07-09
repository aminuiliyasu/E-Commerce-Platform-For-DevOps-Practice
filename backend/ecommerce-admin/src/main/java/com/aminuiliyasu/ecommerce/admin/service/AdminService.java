package com.aminuiliyasu.ecommerce.admin.service;

import com.aminuiliyasu.ecommerce.admin.dto.CouponRequest;
import com.aminuiliyasu.ecommerce.admin.dto.CouponResponse;
import com.aminuiliyasu.ecommerce.admin.dto.DashboardMetrics;
import com.aminuiliyasu.ecommerce.catalog.service.CatalogService;
import com.aminuiliyasu.ecommerce.common.exception.BusinessException;
import com.aminuiliyasu.ecommerce.common.exception.ResourceNotFoundException;
import com.aminuiliyasu.ecommerce.order.entity.Coupon;
import com.aminuiliyasu.ecommerce.order.repository.CouponRepository;
import com.aminuiliyasu.ecommerce.order.repository.OrderRepository;
import com.aminuiliyasu.ecommerce.order.service.OrderService;
import com.aminuiliyasu.ecommerce.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final CatalogService catalogService;
    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CouponRepository couponRepository;

    public DashboardMetrics getDashboardMetrics() {
        Instant startOfDay = Instant.now().truncatedTo(ChronoUnit.DAYS);
        return DashboardMetrics.builder()
                .totalProducts(catalogService.countProducts())
                .totalOrders(orderService.countOrders())
                .totalUsers(userRepository.count())
                .lowStockProducts(catalogService.countLowStockProducts(10))
                .totalRevenue(orderRepository.sumTotalRevenue())
                .revenueToday(orderRepository.sumRevenueSince(startOfDay))
                .ordersToday(orderRepository.countSince(startOfDay))
                .build();
    }

    public List<CouponResponse> listCoupons() {
        return couponRepository.findAll().stream().map(this::toCouponResponse).collect(Collectors.toList());
    }

    @Transactional
    public CouponResponse createCoupon(CouponRequest request) {
        if (couponRepository.findByCode(request.getCode().toUpperCase()).isPresent()) {
            throw new BusinessException("COUPON_EXISTS", "Coupon code already exists", HttpStatus.CONFLICT);
        }
        Coupon coupon = Coupon.builder()
                .code(request.getCode().toUpperCase())
                .description(request.getDescription())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderAmount(request.getMinOrderAmount())
                .maxUses(request.getMaxUses())
                .active(request.isActive())
                .expiresAt(request.getExpiresAt())
                .build();
        return toCouponResponse(couponRepository.save(coupon));
    }

    @Transactional
    public CouponResponse updateCoupon(Long id, CouponRequest request) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon", String.valueOf(id)));
        coupon.setDescription(request.getDescription());
        coupon.setDiscountType(request.getDiscountType());
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMinOrderAmount(request.getMinOrderAmount());
        coupon.setMaxUses(request.getMaxUses());
        coupon.setActive(request.isActive());
        coupon.setExpiresAt(request.getExpiresAt());
        return toCouponResponse(couponRepository.save(coupon));
    }

    @Transactional
    public void deleteCoupon(Long id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon", String.valueOf(id)));
        coupon.setActive(false);
        couponRepository.save(coupon);
    }

    private CouponResponse toCouponResponse(Coupon coupon) {
        return CouponResponse.builder()
                .id(coupon.getId())
                .code(coupon.getCode())
                .description(coupon.getDescription())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .minOrderAmount(coupon.getMinOrderAmount())
                .maxUses(coupon.getMaxUses())
                .usedCount(coupon.getUsedCount())
                .active(coupon.isActive())
                .expiresAt(coupon.getExpiresAt())
                .build();
    }
}
