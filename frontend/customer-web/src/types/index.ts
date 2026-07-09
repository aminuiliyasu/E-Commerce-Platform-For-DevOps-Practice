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
  phone?: string;
  roles: string[];
}

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
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
  tags: string[];
  averageRating: number;
  reviewCount: number;
  active: boolean;
  featured: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentId?: string;
  imageUrl?: string;
  active: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface Address {
  id: number;
  label: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface CheckoutPreview {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  couponCode?: string;
  itemCount: number;
}

export interface OrderItem {
  id: number;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl?: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  status: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  couponCode?: string;
  shippingFullName: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone?: string;
  items: OrderItem[];
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
}
