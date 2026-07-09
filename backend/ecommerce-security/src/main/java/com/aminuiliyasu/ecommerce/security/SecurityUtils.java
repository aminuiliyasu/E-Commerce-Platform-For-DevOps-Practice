package com.aminuiliyasu.ecommerce.security;

import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static AuthenticatedUser getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user;
        }
        return null;
    }

    public static Long getCurrentUserId() {
        AuthenticatedUser user = getCurrentUser();
        return user != null ? user.getId() : null;
    }
}
