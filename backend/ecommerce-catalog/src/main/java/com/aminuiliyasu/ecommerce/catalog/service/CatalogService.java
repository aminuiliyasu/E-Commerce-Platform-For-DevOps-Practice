package com.aminuiliyasu.ecommerce.catalog.service;

import com.aminuiliyasu.ecommerce.catalog.document.Category;
import com.aminuiliyasu.ecommerce.catalog.document.Product;
import com.aminuiliyasu.ecommerce.catalog.document.Review;
import com.aminuiliyasu.ecommerce.catalog.dto.*;
import com.aminuiliyasu.ecommerce.catalog.repository.CategoryRepository;
import com.aminuiliyasu.ecommerce.catalog.repository.ProductRepository;
import com.aminuiliyasu.ecommerce.catalog.repository.ReviewRepository;
import com.aminuiliyasu.ecommerce.common.dto.PageResponse;
import com.aminuiliyasu.ecommerce.common.exception.BusinessException;
import com.aminuiliyasu.ecommerce.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ReviewRepository reviewRepository;

    public PageResponse<ProductResponse> listProducts(int page, int size, String categoryId, String search, Boolean featured) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Product> result;
        if (search != null && !search.isBlank()) {
            result = productRepository.searchActive(search.trim(), pageable);
        } else if (categoryId != null && !categoryId.isBlank()) {
            result = productRepository.findByActiveTrueAndCategoryId(categoryId, pageable);
        } else if (Boolean.TRUE.equals(featured)) {
            result = productRepository.findByActiveTrueAndFeaturedTrue(pageable);
        } else {
            result = productRepository.findByActiveTrue(pageable);
        }
        return toPageResponse(result);
    }

    public ProductResponse getProductBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product", slug));
        return toProductResponse(product);
    }

    public Product getProductEntity(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    public ProductResponse createProduct(ProductRequest request) {
        if (productRepository.findBySku(request.getSku()).isPresent()) {
            throw new BusinessException("SKU_EXISTS", "SKU already exists", HttpStatus.CONFLICT);
        }
        String categoryName = resolveCategoryName(request.getCategoryId());
        Product product = Product.builder()
                .slug(generateSlug(request.getName()))
                .name(request.getName())
                .description(request.getDescription())
                .categoryId(request.getCategoryId())
                .categoryName(categoryName)
                .brand(request.getBrand())
                .sku(request.getSku())
                .price(request.getPrice())
                .compareAtPrice(request.getCompareAtPrice())
                .stockQuantity(request.getStockQuantity())
                .images(request.getImages() != null ? request.getImages() : List.of())
                .tags(request.getTags() != null ? request.getTags() : List.of())
                .attributes(request.getAttributes() != null ? request.getAttributes() : java.util.Map.of())
                .active(request.isActive())
                .featured(request.isFeatured())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return toProductResponse(productRepository.save(product));
    }

    public ProductResponse updateProduct(String id, ProductRequest request) {
        Product product = getProductEntity(id);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setCategoryId(request.getCategoryId());
        product.setCategoryName(resolveCategoryName(request.getCategoryId()));
        product.setBrand(request.getBrand());
        product.setSku(request.getSku());
        product.setPrice(request.getPrice());
        product.setCompareAtPrice(request.getCompareAtPrice());
        product.setStockQuantity(request.getStockQuantity());
        if (request.getImages() != null) product.setImages(request.getImages());
        if (request.getTags() != null) product.setTags(request.getTags());
        if (request.getAttributes() != null) product.setAttributes(request.getAttributes());
        product.setActive(request.isActive());
        product.setFeatured(request.isFeatured());
        product.setUpdatedAt(Instant.now());
        return toProductResponse(productRepository.save(product));
    }

    public void deleteProduct(String id) {
        Product product = getProductEntity(id);
        product.setActive(false);
        product.setUpdatedAt(Instant.now());
        productRepository.save(product);
    }

    public void decrementStock(String productId, int quantity) {
        Product product = getProductEntity(productId);
        if (product.getStockQuantity() < quantity) {
            throw new BusinessException("INSUFFICIENT_STOCK", "Insufficient stock for " + product.getName(), HttpStatus.BAD_REQUEST);
        }
        product.setStockQuantity(product.getStockQuantity() - quantity);
        product.setUpdatedAt(Instant.now());
        productRepository.save(product);
    }

    public List<CategoryResponse> listCategories() {
        return categoryRepository.findByActiveTrue().stream()
                .map(this::toCategoryResponse)
                .collect(Collectors.toList());
    }

    public CategoryResponse createCategory(CategoryRequest request) {
        Category category = Category.builder()
                .slug(generateSlug(request.getName()))
                .name(request.getName())
                .description(request.getDescription())
                .parentId(request.getParentId())
                .imageUrl(request.getImageUrl())
                .active(request.isActive())
                .createdAt(Instant.now())
                .build();
        return toCategoryResponse(categoryRepository.save(category));
    }

    public CategoryResponse updateCategory(String id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setParentId(request.getParentId());
        category.setImageUrl(request.getImageUrl());
        category.setActive(request.isActive());
        return toCategoryResponse(categoryRepository.save(category));
    }

    public void deleteCategory(String id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        category.setActive(false);
        categoryRepository.save(category);
    }

    public ReviewResponse addReview(String productId, Long userId, String userName, ReviewRequest request) {
        getProductEntity(productId);
        Review review = Review.builder()
                .productId(productId)
                .userId(userId)
                .userName(userName)
                .rating(request.getRating())
                .comment(request.getComment())
                .status("APPROVED")
                .createdAt(Instant.now())
                .build();
        Review saved = reviewRepository.save(review);
        updateProductRating(productId);
        return toReviewResponse(saved);
    }

    public List<ReviewResponse> getProductReviews(String productId) {
        return reviewRepository.findByProductIdAndStatus(productId, "APPROVED").stream()
                .map(this::toReviewResponse)
                .collect(Collectors.toList());
    }

    public List<ReviewResponse> getPendingReviews() {
        return reviewRepository.findByStatus("PENDING").stream()
                .map(this::toReviewResponse)
                .collect(Collectors.toList());
    }

    public ReviewResponse moderateReview(String reviewId, String status) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", reviewId));
        review.setStatus(status);
        Review saved = reviewRepository.save(review);
        updateProductRating(review.getProductId());
        return toReviewResponse(saved);
    }

    public long countProducts() {
        return productRepository.findAll().stream().filter(Product::isActive).count();
    }

    public long countLowStockProducts(int threshold) {
        return productRepository.findAll().stream()
                .filter(p -> p.isActive() && p.getStockQuantity() <= threshold)
                .count();
    }

    private void updateProductRating(String productId) {
        List<Review> reviews = reviewRepository.findByProductIdAndStatus(productId, "APPROVED");
        Product product = getProductEntity(productId);
        product.setReviewCount(reviews.size());
        product.setAverageRating(reviews.stream().mapToInt(Review::getRating).average().orElse(0.0));
        productRepository.save(product);
    }

    private String resolveCategoryName(String categoryId) {
        if (categoryId == null) return null;
        return categoryRepository.findById(categoryId).map(Category::getName).orElse(null);
    }

    private String generateSlug(String name) {
        String base = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        return base + "-" + System.currentTimeMillis() % 10000;
    }

    private PageResponse<ProductResponse> toPageResponse(Page<Product> page) {
        return PageResponse.<ProductResponse>builder()
                .content(page.getContent().stream().map(this::toProductResponse).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    public ProductResponse toProductResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .slug(product.getSlug())
                .name(product.getName())
                .description(product.getDescription())
                .categoryId(product.getCategoryId())
                .categoryName(product.getCategoryName())
                .brand(product.getBrand())
                .sku(product.getSku())
                .price(product.getPrice())
                .compareAtPrice(product.getCompareAtPrice())
                .stockQuantity(product.getStockQuantity())
                .images(product.getImages())
                .tags(product.getTags())
                .attributes(product.getAttributes())
                .averageRating(product.getAverageRating())
                .reviewCount(product.getReviewCount())
                .active(product.isActive())
                .featured(product.isFeatured())
                .createdAt(product.getCreatedAt())
                .build();
    }

    private CategoryResponse toCategoryResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .slug(category.getSlug())
                .name(category.getName())
                .description(category.getDescription())
                .parentId(category.getParentId())
                .imageUrl(category.getImageUrl())
                .active(category.isActive())
                .build();
    }

    private ReviewResponse toReviewResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProductId())
                .userId(review.getUserId())
                .userName(review.getUserName())
                .rating(review.getRating())
                .comment(review.getComment())
                .status(review.getStatus())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
