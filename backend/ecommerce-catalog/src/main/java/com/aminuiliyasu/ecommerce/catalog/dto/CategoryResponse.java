package com.aminuiliyasu.ecommerce.catalog.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CategoryResponse {
    private String id;
    private String slug;
    private String name;
    private String description;
    private String parentId;
    private String imageUrl;
    private boolean active;
}
