package com.aminuiliyasu.ecommerce.catalog.controller;

import com.aminuiliyasu.ecommerce.catalog.dto.ReviewRequest;
import com.aminuiliyasu.ecommerce.catalog.dto.ReviewResponse;
import com.aminuiliyasu.ecommerce.catalog.service.CatalogService;
import com.aminuiliyasu.ecommerce.common.dto.ApiResponse;
import com.aminuiliyasu.ecommerce.common.dto.PageResponse;
import com.aminuiliyasu.ecommerce.catalog.dto.ProductResponse;
import com.aminuiliyasu.ecommerce.catalog.dto.CategoryResponse;
import com.aminuiliyasu.ecommerce.security.AuthenticatedUser;
import com.aminuiliyasu.ecommerce.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/products")
    public ApiResponse<PageResponse<ProductResponse>> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean featured) {
        return ApiResponse.ok(catalogService.listProducts(page, size, categoryId, search, featured));
    }

    @GetMapping("/products/{slug}")
    public ApiResponse<ProductResponse> getProduct(@PathVariable String slug) {
        return ApiResponse.ok(catalogService.getProductBySlug(slug));
    }

    @GetMapping("/categories")
    public ApiResponse<List<CategoryResponse>> listCategories() {
        return ApiResponse.ok(catalogService.listCategories());
    }

    @GetMapping("/products/id/{productId}/reviews")
    public ApiResponse<List<ReviewResponse>> getReviews(@PathVariable String productId) {
        return ApiResponse.ok(catalogService.getProductReviews(productId));
    }

    @PostMapping("/products/id/{productId}/reviews")
    public ApiResponse<ReviewResponse> addReview(@PathVariable String productId,
                                                  @Valid @RequestBody ReviewRequest request) {
        AuthenticatedUser user = SecurityUtils.getCurrentUser();
        String userName = user.getFirstName() + " " + user.getLastName();
        return ApiResponse.ok(catalogService.addReview(productId, user.getId(), userName, request));
    }
}
