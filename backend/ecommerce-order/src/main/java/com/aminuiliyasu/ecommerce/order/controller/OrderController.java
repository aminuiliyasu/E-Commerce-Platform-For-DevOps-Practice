package com.aminuiliyasu.ecommerce.order.controller;

import com.aminuiliyasu.ecommerce.common.dto.ApiResponse;
import com.aminuiliyasu.ecommerce.common.dto.PageResponse;
import com.aminuiliyasu.ecommerce.order.dto.*;
import com.aminuiliyasu.ecommerce.order.service.OrderService;
import com.aminuiliyasu.ecommerce.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/checkout/preview")
    public ApiResponse<CheckoutPreviewResponse> preview(@RequestBody(required = false) CheckoutRequest request) {
        String coupon = request != null ? request.getCouponCode() : null;
        return ApiResponse.ok(orderService.previewCheckout(SecurityUtils.getCurrentUserId(), coupon));
    }

    @PostMapping("/checkout/confirm")
    public ApiResponse<OrderResponse> confirm(@Valid @RequestBody CheckoutRequest request) {
        return ApiResponse.ok("Order placed successfully", orderService.confirmCheckout(SecurityUtils.getCurrentUserId(), request));
    }

    @GetMapping("/orders")
    public ApiResponse<PageResponse<OrderResponse>> getOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(orderService.getUserOrders(SecurityUtils.getCurrentUserId(), page, size));
    }

    @GetMapping("/orders/{id}")
    public ApiResponse<OrderResponse> getOrder(@PathVariable Long id) {
        return ApiResponse.ok(orderService.getUserOrder(SecurityUtils.getCurrentUserId(), id));
    }
}
