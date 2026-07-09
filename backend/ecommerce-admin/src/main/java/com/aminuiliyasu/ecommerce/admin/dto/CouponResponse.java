package com.aminuiliyasu.ecommerce.admin.dto;

import com.aminuiliyasu.ecommerce.order.entity.DiscountType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class CouponResponse {
    private Long id;
    private String code;
    private String description;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderAmount;
    private Integer maxUses;
    private int usedCount;
    private boolean active;
    private Instant expiresAt;
}
