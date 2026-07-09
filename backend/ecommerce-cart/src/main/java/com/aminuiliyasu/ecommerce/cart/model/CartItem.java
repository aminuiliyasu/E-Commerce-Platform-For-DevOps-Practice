package com.aminuiliyasu.ecommerce.cart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItem implements Serializable {
    private String productId;
    private String productName;
    private String productSlug;
    private String imageUrl;
    private BigDecimal unitPrice;
    private int quantity;
}
