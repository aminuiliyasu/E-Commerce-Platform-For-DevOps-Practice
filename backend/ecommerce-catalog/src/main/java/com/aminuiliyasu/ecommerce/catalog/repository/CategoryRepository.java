package com.aminuiliyasu.ecommerce.catalog.repository;

import com.aminuiliyasu.ecommerce.catalog.document.Category;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends MongoRepository<Category, String> {
    Optional<Category> findBySlug(String slug);
    List<Category> findByActiveTrue();
}
