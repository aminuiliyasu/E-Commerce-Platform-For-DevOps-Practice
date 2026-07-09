package com.aminuiliyasu.ecommerce.catalog.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ReviewResponse {
    private String id;
    private String productId;
    private Long userId;
    private String userName;
    private int rating;
    private String comment;
    private String status;
    private Instant createdAt;
}
