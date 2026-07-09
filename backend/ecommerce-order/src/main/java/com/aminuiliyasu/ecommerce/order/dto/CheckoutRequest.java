package com.aminuiliyasu.ecommerce.order.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckoutRequest {
    @NotNull
    private Long addressId;
    private String couponCode;
    private String idempotencyKey;
}
