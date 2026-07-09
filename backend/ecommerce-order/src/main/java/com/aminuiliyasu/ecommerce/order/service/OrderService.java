package com.aminuiliyasu.ecommerce.order.service;

import com.aminuiliyasu.ecommerce.cart.model.Cart;
import com.aminuiliyasu.ecommerce.cart.model.CartItem;
import com.aminuiliyasu.ecommerce.cart.service.CartService;
import com.aminuiliyasu.ecommerce.catalog.service.CatalogService;
import com.aminuiliyasu.ecommerce.common.dto.PageResponse;
import com.aminuiliyasu.ecommerce.common.exception.BusinessException;
import com.aminuiliyasu.ecommerce.common.exception.ResourceNotFoundException;
import com.aminuiliyasu.ecommerce.order.dto.*;
import com.aminuiliyasu.ecommerce.order.entity.*;
import com.aminuiliyasu.ecommerce.order.event.OrderConfirmedEvent;
import com.aminuiliyasu.ecommerce.order.repository.CouponRepository;
import com.aminuiliyasu.ecommerce.order.repository.OrderRepository;
import com.aminuiliyasu.ecommerce.user.entity.User;
import com.aminuiliyasu.ecommerce.user.entity.UserAddress;
import com.aminuiliyasu.ecommerce.user.repository.UserAddressRepository;
import com.aminuiliyasu.ecommerce.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final BigDecimal SHIPPING_FLAT_RATE = new BigDecimal("9.99");
    private static final BigDecimal TAX_RATE = new BigDecimal("0.075");
    private static final String ORDER_EXCHANGE = "order.events";
    private static final String ORDER_ROUTING_KEY = "order.confirmed";

    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final UserAddressRepository addressRepository;
    private final CartService cartService;
    private final CatalogService catalogService;
    private final UserService userService;
    private final RabbitTemplate rabbitTemplate;

    public CheckoutPreviewResponse previewCheckout(Long userId, String couponCode) {
        Cart cart = cartService.getCart("user:" + userId);
        if (cart.getItems().isEmpty()) {
            throw new BusinessException("EMPTY_CART", "Cart is empty", HttpStatus.BAD_REQUEST);
        }
        return buildPreview(cart, couponCode);
    }

    @Transactional
    public OrderResponse confirmCheckout(Long userId, CheckoutRequest request) {
        Cart cart = cartService.getCart("user:" + userId);
        if (cart.getItems().isEmpty()) {
            throw new BusinessException("EMPTY_CART", "Cart is empty", HttpStatus.BAD_REQUEST);
        }

        UserAddress address = addressRepository.findByIdAndUserId(request.getAddressId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", String.valueOf(request.getAddressId())));

        CheckoutPreviewResponse preview = buildPreview(cart, request.getCouponCode());
        User user = userService.getUserById(userId);

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .userId(userId)
                .status(OrderStatus.CONFIRMED)
                .subtotal(preview.getSubtotal())
                .shippingCost(preview.getShippingCost())
                .taxAmount(preview.getTaxAmount())
                .discountAmount(preview.getDiscountAmount())
                .total(preview.getTotal())
                .couponCode(preview.getCouponCode())
                .shippingFullName(address.getFullName())
                .shippingStreet(address.getStreet())
                .shippingCity(address.getCity())
                .shippingState(address.getState())
                .shippingPostalCode(address.getPostalCode())
                .shippingCountry(address.getCountry())
                .shippingPhone(address.getPhone())
                .build();

        for (CartItem cartItem : cart.getItems()) {
            catalogService.decrementStock(cartItem.getProductId(), cartItem.getQuantity());
            var product = catalogService.getProductEntity(cartItem.getProductId());
            BigDecimal lineTotal = cartItem.getUnitPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .productId(cartItem.getProductId())
                    .productName(cartItem.getProductName())
                    .productSlug(cartItem.getProductSlug())
                    .imageUrl(cartItem.getImageUrl())
                    .sku(product.getSku())
                    .unitPrice(cartItem.getUnitPrice())
                    .quantity(cartItem.getQuantity())
                    .total(lineTotal)
                    .build();
            order.getItems().add(orderItem);
        }

        Order saved = orderRepository.save(order);
        applyCouponUsage(request.getCouponCode());
        cartService.clearCart("user:" + userId);
        publishOrderEvent(saved, user.getEmail());
        return toOrderResponse(saved);
    }

    public PageResponse<OrderResponse> getUserOrders(Long userId, int page, int size) {
        Page<Order> orders = orderRepository.findByUserId(userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return toPageResponse(orders);
    }

    public OrderResponse getUserOrder(Long userId, Long orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", String.valueOf(orderId)));
        return toOrderResponse(order);
    }

    public PageResponse<OrderResponse> getAllOrders(int page, int size, OrderStatus status) {
        Page<Order> orders;
        if (status != null) {
            orders = orderRepository.findByStatus(status, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        } else {
            orders = orderRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        }
        return toPageResponse(orders);
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", String.valueOf(orderId)));
        order.setStatus(status);
        return toOrderResponse(orderRepository.save(order));
    }

    public long countOrders() {
        return orderRepository.count();
    }

    private CheckoutPreviewResponse buildPreview(Cart cart, String couponCode) {
        BigDecimal subtotal = cart.getSubtotal();
        BigDecimal shipping = subtotal.compareTo(new BigDecimal("100")) >= 0 ? BigDecimal.ZERO : SHIPPING_FLAT_RATE;
        BigDecimal discount = calculateDiscount(subtotal, couponCode);
        BigDecimal taxable = subtotal.subtract(discount).max(BigDecimal.ZERO);
        BigDecimal tax = taxable.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(shipping).add(tax).setScale(2, RoundingMode.HALF_UP);

        return CheckoutPreviewResponse.builder()
                .subtotal(subtotal)
                .shippingCost(shipping)
                .taxAmount(tax)
                .discountAmount(discount)
                .total(total)
                .couponCode(couponCode)
                .itemCount(cart.getItemCount())
                .build();
    }

    private BigDecimal calculateDiscount(BigDecimal subtotal, String couponCode) {
        if (couponCode == null || couponCode.isBlank()) return BigDecimal.ZERO;
        Coupon coupon = couponRepository.findByCode(couponCode.toUpperCase())
                .orElseThrow(() -> new BusinessException("INVALID_COUPON", "Coupon code is invalid", HttpStatus.BAD_REQUEST));

        if (!coupon.isActive()) {
            throw new BusinessException("INVALID_COUPON", "Coupon is not active", HttpStatus.BAD_REQUEST);
        }
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("INVALID_COUPON", "Coupon has expired", HttpStatus.BAD_REQUEST);
        }
        if (coupon.getMaxUses() != null && coupon.getUsedCount() >= coupon.getMaxUses()) {
            throw new BusinessException("INVALID_COUPON", "Coupon usage limit reached", HttpStatus.BAD_REQUEST);
        }
        if (coupon.getMinOrderAmount() != null && subtotal.compareTo(coupon.getMinOrderAmount()) < 0) {
            throw new BusinessException("INVALID_COUPON", "Order does not meet minimum amount for coupon", HttpStatus.BAD_REQUEST);
        }

        if (coupon.getDiscountType() == DiscountType.PERCENTAGE) {
            return subtotal.multiply(coupon.getDiscountValue()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        }
        return coupon.getDiscountValue().min(subtotal);
    }

    private void applyCouponUsage(String couponCode) {
        if (couponCode == null || couponCode.isBlank()) return;
        couponRepository.findByCode(couponCode.toUpperCase()).ifPresent(coupon -> {
            coupon.setUsedCount(coupon.getUsedCount() + 1);
            couponRepository.save(coupon);
        });
    }

    private void publishOrderEvent(Order order, String userEmail) {
        OrderConfirmedEvent event = OrderConfirmedEvent.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .userEmail(userEmail)
                .total(order.getTotal())
                .items(order.getItems().stream().map(i -> OrderConfirmedEvent.OrderItemEvent.builder()
                        .productId(i.getProductId())
                        .productName(i.getProductName())
                        .quantity(i.getQuantity())
                        .unitPrice(i.getUnitPrice())
                        .build()).collect(Collectors.toList()))
                .build();
        rabbitTemplate.convertAndSend(ORDER_EXCHANGE, ORDER_ROUTING_KEY, event);
    }

    private String generateOrderNumber() {
        return "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private PageResponse<OrderResponse> toPageResponse(Page<Order> page) {
        return PageResponse.<OrderResponse>builder()
                .content(page.getContent().stream().map(this::toOrderResponse).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    public OrderResponse toOrderResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .status(order.getStatus())
                .subtotal(order.getSubtotal())
                .shippingCost(order.getShippingCost())
                .taxAmount(order.getTaxAmount())
                .discountAmount(order.getDiscountAmount())
                .total(order.getTotal())
                .couponCode(order.getCouponCode())
                .shippingFullName(order.getShippingFullName())
                .shippingStreet(order.getShippingStreet())
                .shippingCity(order.getShippingCity())
                .shippingState(order.getShippingState())
                .shippingPostalCode(order.getShippingPostalCode())
                .shippingCountry(order.getShippingCountry())
                .shippingPhone(order.getShippingPhone())
                .items(order.getItems().stream().map(i -> OrderItemResponse.builder()
                        .id(i.getId())
                        .productId(i.getProductId())
                        .productName(i.getProductName())
                        .productSlug(i.getProductSlug())
                        .imageUrl(i.getImageUrl())
                        .sku(i.getSku())
                        .unitPrice(i.getUnitPrice())
                        .quantity(i.getQuantity())
                        .total(i.getTotal())
                        .build()).collect(Collectors.toList()))
                .createdAt(order.getCreatedAt())
                .build();
    }
}
