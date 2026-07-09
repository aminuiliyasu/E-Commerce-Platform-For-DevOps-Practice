package com.aminuiliyasu.ecommerce.admin.dto;

import com.aminuiliyasu.ecommerce.order.entity.DiscountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
public class CouponRequest {
    @NotBlank
    private String code;
    @NotBlank
    private String description;
    @NotNull
    private DiscountType discountType;
    @NotNull
    private BigDecimal discountValue;
    private BigDecimal minOrderAmount;
    private Integer maxUses;
    private boolean active = true;
    private Instant expiresAt;
}
