package com.aminuiliyasu.ecommerce.user.controller;

import com.aminuiliyasu.ecommerce.common.dto.ApiResponse;
import com.aminuiliyasu.ecommerce.security.SecurityUtils;
import com.aminuiliyasu.ecommerce.user.dto.*;
import com.aminuiliyasu.ecommerce.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/auth/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok("Registration successful", userService.register(request));
    }

    @PostMapping("/auth/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(userService.login(request));
    }

    @PostMapping("/auth/refresh")
    public ApiResponse<AuthResponse> refresh(@RequestBody Map<String, String> body) {
        return ApiResponse.ok(userService.refreshToken(body.get("refreshToken")));
    }

    @GetMapping("/profile")
    public ApiResponse<UserResponse> getProfile() {
        return ApiResponse.ok(userService.getProfile(SecurityUtils.getCurrentUserId()));
    }

    @PutMapping("/profile")
    public ApiResponse<UserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok(userService.updateProfile(SecurityUtils.getCurrentUserId(), request));
    }

    @GetMapping("/addresses")
    public ApiResponse<List<AddressResponse>> getAddresses() {
        return ApiResponse.ok(userService.getAddresses(SecurityUtils.getCurrentUserId()));
    }

    @PostMapping("/addresses")
    public ApiResponse<AddressResponse> addAddress(@Valid @RequestBody AddressRequest request) {
        return ApiResponse.ok(userService.addAddress(SecurityUtils.getCurrentUserId(), request));
    }

    @PutMapping("/addresses/{id}")
    public ApiResponse<AddressResponse> updateAddress(@PathVariable Long id,
                                                       @Valid @RequestBody AddressRequest request) {
        return ApiResponse.ok(userService.updateAddress(SecurityUtils.getCurrentUserId(), id, request));
    }

    @DeleteMapping("/addresses/{id}")
    public ApiResponse<Void> deleteAddress(@PathVariable Long id) {
        userService.deleteAddress(SecurityUtils.getCurrentUserId(), id);
        return ApiResponse.ok("Address deleted", null);
    }
}
