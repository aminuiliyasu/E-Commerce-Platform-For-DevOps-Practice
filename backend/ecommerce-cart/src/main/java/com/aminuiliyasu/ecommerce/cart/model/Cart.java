package com.aminuiliyasu.ecommerce.cart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cart implements Serializable {
    @Builder.Default
    private List<CartItem> items = new ArrayList<>();
    private BigDecimal subtotal;
    private int itemCount;
}
