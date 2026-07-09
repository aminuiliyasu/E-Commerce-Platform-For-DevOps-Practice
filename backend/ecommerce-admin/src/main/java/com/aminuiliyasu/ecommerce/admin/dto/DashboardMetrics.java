package com.aminuiliyasu.ecommerce.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DashboardMetrics {
    private long totalProducts;
    private long totalOrders;
    private long totalUsers;
    private long lowStockProducts;
    private BigDecimal totalRevenue;
    private BigDecimal revenueToday;
    private long ordersToday;
}
