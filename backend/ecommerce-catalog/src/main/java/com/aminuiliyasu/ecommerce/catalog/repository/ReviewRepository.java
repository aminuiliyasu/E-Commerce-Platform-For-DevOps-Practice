package com.aminuiliyasu.ecommerce.catalog.repository;

import com.aminuiliyasu.ecommerce.catalog.document.Review;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByProductIdAndStatus(String productId, String status);
    List<Review> findByStatus(String status);
}
