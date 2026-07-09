package com.aminuiliyasu.ecommerce.catalog.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "categories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    private String id;

    @Indexed(unique = true)
    private String slug;

    private String name;
    private String description;
    private String parentId;
    private String imageUrl;

    @Builder.Default
    private boolean active = true;

    private Instant createdAt;
}
