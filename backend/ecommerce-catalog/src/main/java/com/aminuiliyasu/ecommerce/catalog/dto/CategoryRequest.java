package com.aminuiliyasu.ecommerce.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryRequest {
    @NotBlank
    private String name;
    private String description;
    private String parentId;
    private String imageUrl;
    private boolean active = true;
}
