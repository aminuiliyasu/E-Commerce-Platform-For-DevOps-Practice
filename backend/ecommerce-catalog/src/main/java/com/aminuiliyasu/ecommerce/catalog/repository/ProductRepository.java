package com.aminuiliyasu.ecommerce.catalog.repository;

import com.aminuiliyasu.ecommerce.catalog.document.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Optional;

public interface ProductRepository extends MongoRepository<Product, String> {
    Optional<Product> findBySlug(String slug);
    Optional<Product> findBySku(String sku);
    Page<Product> findByActiveTrue(Pageable pageable);
    Page<Product> findByActiveTrueAndFeaturedTrue(Pageable pageable);
    Page<Product> findByActiveTrueAndCategoryId(String categoryId, Pageable pageable);

    @Query("{ 'active': true, $or: [ { 'name': { $regex: ?0, $options: 'i' } }, { 'description': { $regex: ?0, $options: 'i' } }, { 'tags': { $regex: ?0, $options: 'i' } } ] }")
    Page<Product> searchActive(String query, Pageable pageable);
}
