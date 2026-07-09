package com.aminuiliyasu.ecommerce.catalog.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class ProductRequest {
    @NotBlank
    private String name;
    private String description;
    private String categoryId;
    private String brand;
    @NotBlank
    private String sku;
    @NotNull @DecimalMin("0.0")
    private BigDecimal price;
    private BigDecimal compareAtPrice;
    @Min(0)
    private int stockQuantity;
    private List<String> images;
    private List<String> tags;
    private Map<String, String> attributes;
    private boolean active = true;
    private boolean featured = false;
}
