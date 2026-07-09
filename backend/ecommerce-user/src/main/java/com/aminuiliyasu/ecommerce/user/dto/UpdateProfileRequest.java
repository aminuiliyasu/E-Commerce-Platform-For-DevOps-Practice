package com.aminuiliyasu.ecommerce.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @NotBlank
    private String firstName;
    @NotBlank
    private String lastName;
    private String phone;
}
