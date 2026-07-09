package com.aminuiliyasu.ecommerce.catalog.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Document(collection = "products")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    private String id;

    @Indexed(unique = true)
    private String slug;

    private String name;
    private String description;
    private String categoryId;
    private String categoryName;
    private String brand;
    private String sku;

    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal compareAtPrice = BigDecimal.ZERO;

    @Builder.Default
    private int stockQuantity = 0;

    @Builder.Default
    private List<String> images = new ArrayList<>();

    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Builder.Default
    private Map<String, String> attributes = Map.of();

    @Builder.Default
    private double averageRating = 0.0;

    @Builder.Default
    private int reviewCount = 0;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private boolean featured = false;

    private Instant createdAt;
    private Instant updatedAt;
}
