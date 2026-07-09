package com.aminuiliyasu.ecommerce.catalog.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "reviews")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Review {

    @Id
    private String id;

    private String productId;
    private Long userId;
    private String userName;
    private int rating;
    private String comment;

    @Builder.Default
    private String status = "APPROVED";

    private Instant createdAt;
}
