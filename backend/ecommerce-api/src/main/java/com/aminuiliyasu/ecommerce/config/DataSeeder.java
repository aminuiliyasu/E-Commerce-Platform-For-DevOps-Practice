package com.aminuiliyasu.ecommerce.config;

import com.aminuiliyasu.ecommerce.catalog.document.Category;
import com.aminuiliyasu.ecommerce.catalog.document.Product;
import com.aminuiliyasu.ecommerce.catalog.repository.CategoryRepository;
import com.aminuiliyasu.ecommerce.catalog.repository.ProductRepository;
import com.aminuiliyasu.ecommerce.order.entity.Coupon;
import com.aminuiliyasu.ecommerce.order.entity.DiscountType;
import com.aminuiliyasu.ecommerce.order.repository.CouponRepository;
import com.aminuiliyasu.ecommerce.user.entity.Role;
import com.aminuiliyasu.ecommerce.user.entity.User;
import com.aminuiliyasu.ecommerce.user.repository.RoleRepository;
import com.aminuiliyasu.ecommerce.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CouponRepository couponRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUsers();
        seedCategoriesAndProducts();
        seedCoupons();
        log.info("Database seeding completed");
    }

    private void seedUsers() {
        if (userRepository.count() > 0) return;

        Role customerRole = roleRepository.findByName("CUSTOMER").orElseThrow();
        Role adminRole = roleRepository.findByName("ADMIN").orElseThrow();

        userRepository.save(User.builder()
                .email("admin@aminuiliyasu.com")
                .password(passwordEncoder.encode("Admin@12345"))
                .firstName("Aminu")
                .lastName("Iliyasu")
                .roles(Set.of(adminRole))
                .enabled(true)
                .build());

        userRepository.save(User.builder()
                .email("customer@example.com")
                .password(passwordEncoder.encode("Customer@123"))
                .firstName("John")
                .lastName("Doe")
                .phone("+1234567890")
                .roles(Set.of(customerRole))
                .enabled(true)
                .build());
    }

    private void seedCategoriesAndProducts() {
        if (categoryRepository.count() > 0) return;

        Category electronics = categoryRepository.save(Category.builder()
                .slug("electronics")
                .name("Electronics")
                .description("Latest gadgets and devices")
                .active(true)
                .createdAt(Instant.now())
                .build());

        Category fashion = categoryRepository.save(Category.builder()
                .slug("fashion")
                .name("Fashion")
                .description("Clothing and accessories")
                .active(true)
                .createdAt(Instant.now())
                .build());

        Category home = categoryRepository.save(Category.builder()
                .slug("home-living")
                .name("Home & Living")
                .description("Furniture and home essentials")
                .active(true)
                .createdAt(Instant.now())
                .build());

        productRepository.saveAll(List.of(
                buildProduct("Wireless Bluetooth Headphones", "Premium noise-cancelling headphones with 30-hour battery life.", electronics, "TECH-AUDIO-001", new BigDecimal("149.99"), new BigDecimal("199.99"), 50, true),
                buildProduct("Smart Watch Pro", "Fitness tracking, heart rate monitor, and GPS enabled smartwatch.", electronics, "TECH-WATCH-002", new BigDecimal("299.99"), new BigDecimal("349.99"), 30, true),
                buildProduct("USB-C Laptop Charger", "65W fast charging adapter compatible with most laptops.", electronics, "TECH-CHRG-003", new BigDecimal("39.99"), null, 100, false),
                buildProduct("Classic Denim Jacket", "Timeless denim jacket with modern fit and premium stitching.", fashion, "FASH-JKT-001", new BigDecimal("79.99"), new BigDecimal("99.99"), 45, true),
                buildProduct("Running Sneakers", "Lightweight running shoes with responsive cushioning.", fashion, "FASH-SNK-002", new BigDecimal("119.99"), null, 60, true),
                buildProduct("Leather Crossbody Bag", "Handcrafted genuine leather bag with adjustable strap.", fashion, "FASH-BAG-003", new BigDecimal("89.99"), new BigDecimal("120.00"), 25, false),
                buildProduct("Ceramic Coffee Mug Set", "Set of 4 handcrafted ceramic mugs, dishwasher safe.", home, "HOME-MUG-001", new BigDecimal("34.99"), null, 80, false),
                buildProduct("Minimalist Desk Lamp", "LED desk lamp with adjustable brightness and warm/cool modes.", home, "HOME-LMP-002", new BigDecimal("49.99"), new BigDecimal("65.00"), 40, true),
                buildProduct("Organic Cotton Bedsheet", "400 thread count organic cotton bedsheet set, queen size.", home, "HOME-BED-003", new BigDecimal("69.99"), null, 35, false),
                buildProduct("Portable Bluetooth Speaker", "Waterproof speaker with 360-degree sound and 12-hour playtime.", electronics, "TECH-SPK-004", new BigDecimal("59.99"), new BigDecimal("79.99"), 70, true)
        ));
    }

    private Product buildProduct(String name, String description, Category category, String sku,
                                  BigDecimal price, BigDecimal compareAt, int stock, boolean featured) {
        String slug = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        return Product.builder()
                .slug(slug)
                .name(name)
                .description(description)
                .categoryId(category.getId())
                .categoryName(category.getName())
                .brand("AminuStore")
                .sku(sku)
                .price(price)
                .compareAtPrice(compareAt != null ? compareAt : BigDecimal.ZERO)
                .stockQuantity(stock)
                .images(List.of("https://picsum.photos/seed/" + sku + "/600/600"))
                .tags(List.of(category.getName().toLowerCase()))
                .active(true)
                .featured(featured)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    private void seedCoupons() {
        if (couponRepository.count() > 0) return;

        couponRepository.save(Coupon.builder()
                .code("WELCOME10")
                .description("10% off your first order")
                .discountType(DiscountType.PERCENTAGE)
                .discountValue(new BigDecimal("10"))
                .minOrderAmount(new BigDecimal("50"))
                .maxUses(1000)
                .active(true)
                .build());

        couponRepository.save(Coupon.builder()
                .code("SAVE20")
                .description("$20 off orders over $150")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("20"))
                .minOrderAmount(new BigDecimal("150"))
                .maxUses(500)
                .active(true)
                .build());
    }
}
