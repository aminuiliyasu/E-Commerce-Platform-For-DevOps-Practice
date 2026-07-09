package com.aminuiliyasu.ecommerce.order.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class OrderItemResponse {
    private Long id;
    private String productId;
    private String productName;
    private String productSlug;
    private String imageUrl;
    private String sku;
    private BigDecimal unitPrice;
    private int quantity;
    private BigDecimal total;
}
