package com.aminuiliyasu.ecommerce.admin.controller;

import com.aminuiliyasu.ecommerce.admin.dto.CouponRequest;
import com.aminuiliyasu.ecommerce.admin.dto.CouponResponse;
import com.aminuiliyasu.ecommerce.admin.dto.DashboardMetrics;
import com.aminuiliyasu.ecommerce.admin.service.AdminService;
import com.aminuiliyasu.ecommerce.catalog.dto.*;
import com.aminuiliyasu.ecommerce.catalog.service.CatalogService;
import com.aminuiliyasu.ecommerce.common.dto.ApiResponse;
import com.aminuiliyasu.ecommerce.common.dto.PageResponse;
import com.aminuiliyasu.ecommerce.order.dto.OrderResponse;
import com.aminuiliyasu.ecommerce.order.entity.OrderStatus;
import com.aminuiliyasu.ecommerce.order.service.OrderService;
import com.aminuiliyasu.ecommerce.user.dto.UserResponse;
import com.aminuiliyasu.ecommerce.user.entity.User;
import com.aminuiliyasu.ecommerce.user.repository.UserRepository;
import com.aminuiliyasu.ecommerce.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final CatalogService catalogService;
    private final OrderService orderService;
    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/dashboard/metrics")
    public ApiResponse<DashboardMetrics> getMetrics() {
        return ApiResponse.ok(adminService.getDashboardMetrics());
    }

    @GetMapping("/products")
    public ApiResponse<PageResponse<ProductResponse>> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(catalogService.listProducts(page, size, null, null, null));
    }

    @PostMapping("/products")
    public ApiResponse<ProductResponse> createProduct(@Valid @RequestBody ProductRequest request) {
        return ApiResponse.ok(catalogService.createProduct(request));
    }

    @PutMapping("/products/{id}")
    public ApiResponse<ProductResponse> updateProduct(@PathVariable String id,
                                                       @Valid @RequestBody ProductRequest request) {
        return ApiResponse.ok(catalogService.updateProduct(id, request));
    }

    @DeleteMapping("/products/{id}")
    public ApiResponse<Void> deleteProduct(@PathVariable String id) {
        catalogService.deleteProduct(id);
        return ApiResponse.ok("Product deleted", null);
    }

    @GetMapping("/categories")
    public ApiResponse<List<CategoryResponse>> listCategories() {
        return ApiResponse.ok(catalogService.listCategories());
    }

    @PostMapping("/categories")
    public ApiResponse<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ApiResponse.ok(catalogService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    public ApiResponse<CategoryResponse> updateCategory(@PathVariable String id,
                                                         @Valid @RequestBody CategoryRequest request) {
        return ApiResponse.ok(catalogService.updateCategory(id, request));
    }

    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable String id) {
        catalogService.deleteCategory(id);
        return ApiResponse.ok("Category deleted", null);
    }

    @GetMapping("/orders")
    public ApiResponse<PageResponse<OrderResponse>> listOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) OrderStatus status) {
        return ApiResponse.ok(orderService.getAllOrders(page, size, status));
    }

    @PatchMapping("/orders/{id}/status")
    public ApiResponse<OrderResponse> updateOrderStatus(@PathVariable Long id,
                                                           @RequestBody Map<String, String> body) {
        OrderStatus status = OrderStatus.valueOf(body.get("status"));
        return ApiResponse.ok(orderService.updateOrderStatus(id, status));
    }

    @GetMapping("/users")
    public ApiResponse<List<UserResponse>> listUsers() {
        List<UserResponse> users = userRepository.findAll().stream()
                .map(userService::toAuthenticatedUser)
                .map(auth -> UserResponse.builder()
                        .id(auth.getId())
                        .email(auth.getEmail())
                        .firstName(auth.getFirstName())
                        .lastName(auth.getLastName())
                        .roles(auth.getRoles())
                        .build())
                .collect(Collectors.toList());
        return ApiResponse.ok(users);
    }

    @PatchMapping("/users/{id}/status")
    public ApiResponse<UserResponse> updateUserStatus(@PathVariable Long id,
                                                       @RequestBody Map<String, Boolean> body) {
        User user = userService.getUserById(id);
        user.setEnabled(body.get("enabled"));
        userRepository.save(user);
        return ApiResponse.ok(userService.getProfile(id));
    }

    @GetMapping("/reviews")
    public ApiResponse<List<ReviewResponse>> getPendingReviews() {
        return ApiResponse.ok(catalogService.getPendingReviews());
    }

    @PatchMapping("/reviews/{id}/moderate")
    public ApiResponse<ReviewResponse> moderateReview(@PathVariable String id,
                                                       @RequestBody Map<String, String> body) {
        return ApiResponse.ok(catalogService.moderateReview(id, body.get("status")));
    }

    @GetMapping("/coupons")
    public ApiResponse<List<CouponResponse>> listCoupons() {
        return ApiResponse.ok(adminService.listCoupons());
    }

    @PostMapping("/coupons")
    public ApiResponse<CouponResponse> createCoupon(@Valid @RequestBody CouponRequest request) {
        return ApiResponse.ok(adminService.createCoupon(request));
    }

    @PutMapping("/coupons/{id}")
    public ApiResponse<CouponResponse> updateCoupon(@PathVariable Long id,
                                                     @Valid @RequestBody CouponRequest request) {
        return ApiResponse.ok(adminService.updateCoupon(id, request));
    }

    @DeleteMapping("/coupons/{id}")
    public ApiResponse<Void> deleteCoupon(@PathVariable Long id) {
        adminService.deleteCoupon(id);
        return ApiResponse.ok("Coupon deleted", null);
    }
}
