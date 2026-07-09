package com.aminuiliyasu.ecommerce.cart.service;

import com.aminuiliyasu.ecommerce.cart.dto.AddToCartRequest;
import com.aminuiliyasu.ecommerce.cart.dto.UpdateCartItemRequest;
import com.aminuiliyasu.ecommerce.cart.model.Cart;
import com.aminuiliyasu.ecommerce.cart.model.CartItem;
import com.aminuiliyasu.ecommerce.catalog.document.Product;
import com.aminuiliyasu.ecommerce.catalog.service.CatalogService;
import com.aminuiliyasu.ecommerce.common.exception.BusinessException;
import com.aminuiliyasu.ecommerce.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartService {

    private static final String CART_PREFIX = "cart:";
    private static final Duration CART_TTL = Duration.ofDays(7);

    private final RedisTemplate<String, Cart> cartRedisTemplate;
    private final CatalogService catalogService;

    public Cart getCart(String cartKey) {
        Cart cart = cartRedisTemplate.opsForValue().get(CART_PREFIX + cartKey);
        return cart != null ? cart : emptyCart();
    }

    public Cart addItem(String cartKey, AddToCartRequest request) {
        Product product = catalogService.getProductEntity(request.getProductId());
        if (!product.isActive()) {
            throw new BusinessException("PRODUCT_INACTIVE", "Product is not available", HttpStatus.BAD_REQUEST);
        }
        if (product.getStockQuantity() < request.getQuantity()) {
            throw new BusinessException("INSUFFICIENT_STOCK", "Not enough stock available", HttpStatus.BAD_REQUEST);
        }

        Cart cart = getCart(cartKey);
        Optional<CartItem> existing = cart.getItems().stream()
                .filter(i -> i.getProductId().equals(request.getProductId()))
                .findFirst();

        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + request.getQuantity());
        } else {
            String imageUrl = product.getImages().isEmpty() ? null : product.getImages().get(0);
            cart.getItems().add(CartItem.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .productSlug(product.getSlug())
                    .imageUrl(imageUrl)
                    .unitPrice(product.getPrice())
                    .quantity(request.getQuantity())
                    .build());
        }

        return saveCart(cartKey, cart);
    }

    public Cart updateItem(String cartKey, String productId, UpdateCartItemRequest request) {
        Cart cart = getCart(cartKey);
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getProductId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item", productId));

        Product product = catalogService.getProductEntity(productId);
        if (product.getStockQuantity() < request.getQuantity()) {
            throw new BusinessException("INSUFFICIENT_STOCK", "Not enough stock available", HttpStatus.BAD_REQUEST);
        }
        item.setQuantity(request.getQuantity());
        return saveCart(cartKey, cart);
    }

    public Cart removeItem(String cartKey, String productId) {
        Cart cart = getCart(cartKey);
        cart.getItems().removeIf(i -> i.getProductId().equals(productId));
        return saveCart(cartKey, cart);
    }

    public void clearCart(String cartKey) {
        cartRedisTemplate.delete(CART_PREFIX + cartKey);
    }

    private Cart saveCart(String cartKey, Cart cart) {
        recalculate(cart);
        cartRedisTemplate.opsForValue().set(CART_PREFIX + cartKey, cart, CART_TTL);
        return cart;
    }

    private void recalculate(Cart cart) {
        BigDecimal subtotal = cart.getItems().stream()
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int itemCount = cart.getItems().stream().mapToInt(CartItem::getQuantity).sum();
        cart.setSubtotal(subtotal);
        cart.setItemCount(itemCount);
    }

    private Cart emptyCart() {
        return Cart.builder().items(new ArrayList<>()).subtotal(BigDecimal.ZERO).itemCount(0).build();
    }
}
