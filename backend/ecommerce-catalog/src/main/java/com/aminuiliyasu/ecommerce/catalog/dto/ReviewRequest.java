package com.aminuiliyasu.ecommerce.catalog.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ReviewRequest {
    @Min(1) @Max(5)
    private int rating;
    @NotBlank
    private String comment;
}
