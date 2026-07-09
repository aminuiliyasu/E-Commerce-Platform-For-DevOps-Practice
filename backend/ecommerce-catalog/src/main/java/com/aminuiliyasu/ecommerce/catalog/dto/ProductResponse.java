package com.aminuiliyasu.ecommerce.catalog.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class ProductResponse {
    private String id;
    private String slug;
    private String name;
    private String description;
    private String categoryId;
    private String categoryName;
    private String brand;
    private String sku;
    private BigDecimal price;
    private BigDecimal compareAtPrice;
    private int stockQuantity;
    private List<String> images;
    private List<String> tags;
    private Map<String, String> attributes;
    private double averageRating;
    private int reviewCount;
    private boolean active;
    private boolean featured;
    private Instant createdAt;
}
