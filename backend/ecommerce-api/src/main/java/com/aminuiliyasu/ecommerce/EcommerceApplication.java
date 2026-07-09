package com.aminuiliyasu.ecommerce;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication(scanBasePackages = "com.aminuiliyasu.ecommerce")
@EnableJpaRepositories(basePackages = "com.aminuiliyasu.ecommerce")
@EntityScan(basePackages = "com.aminuiliyasu.ecommerce")
@EnableMongoRepositories(basePackages = "com.aminuiliyasu.ecommerce.catalog.repository")
public class EcommerceApplication {

    public static void main(String[] args) {
        SpringApplication.run(EcommerceApplication.class, args);
    }
}
