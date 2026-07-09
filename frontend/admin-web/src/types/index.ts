export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface DashboardMetrics {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  lowStockProducts: number;
  totalRevenue: number;
  revenueToday: number;
  ordersToday: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  sku: string;
  price: number;
  compareAtPrice: number;
  stockQuantity: number;
  images: string[];
  active: boolean;
  featured: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  status: string;
  total: number;
  subtotal: number;
  items: { productName: string; quantity: number; total: number }[];
  shippingFullName: string;
  createdAt: string;
}

export interface Coupon {
  id: number;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
}
