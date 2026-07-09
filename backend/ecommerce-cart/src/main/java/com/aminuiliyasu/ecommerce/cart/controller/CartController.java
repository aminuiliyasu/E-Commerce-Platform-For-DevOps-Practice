package com.aminuiliyasu.ecommerce.cart.controller;

import com.aminuiliyasu.ecommerce.cart.dto.AddToCartRequest;
import com.aminuiliyasu.ecommerce.cart.dto.UpdateCartItemRequest;
import com.aminuiliyasu.ecommerce.cart.model.Cart;
import com.aminuiliyasu.ecommerce.cart.service.CartService;
import com.aminuiliyasu.ecommerce.common.dto.ApiResponse;
import com.aminuiliyasu.ecommerce.security.SecurityUtils;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private static final String SESSION_COOKIE = "cart_session";

    private final CartService cartService;

    @GetMapping
    public ApiResponse<Cart> getCart(HttpServletRequest request, HttpServletResponse response) {
        return ApiResponse.ok(cartService.getCart(resolveCartKey(request, response)));
    }

    @PostMapping("/items")
    public ApiResponse<Cart> addItem(@Valid @RequestBody AddToCartRequest body,
                                     HttpServletRequest request, HttpServletResponse response) {
        return ApiResponse.ok(cartService.addItem(resolveCartKey(request, response), body));
    }

    @PatchMapping("/items/{productId}")
    public ApiResponse<Cart> updateItem(@PathVariable String productId,
                                        @Valid @RequestBody UpdateCartItemRequest body,
                                        HttpServletRequest request, HttpServletResponse response) {
        return ApiResponse.ok(cartService.updateItem(resolveCartKey(request, response), productId, body));
    }

    @DeleteMapping("/items/{productId}")
    public ApiResponse<Cart> removeItem(@PathVariable String productId,
                                        HttpServletRequest request, HttpServletResponse response) {
        return ApiResponse.ok(cartService.removeItem(resolveCartKey(request, response), productId));
    }

    private String resolveCartKey(HttpServletRequest request, HttpServletResponse response) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId != null) {
            return "user:" + userId;
        }
        String sessionId = getSessionCookie(request);
        if (sessionId == null) {
            sessionId = UUID.randomUUID().toString();
            Cookie cookie = new Cookie(SESSION_COOKIE, sessionId);
            cookie.setPath("/");
            cookie.setMaxAge(7 * 24 * 60 * 60);
            cookie.setHttpOnly(true);
            response.addCookie(cookie);
        }
        return "session:" + sessionId;
    }

    private String getSessionCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> SESSION_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
