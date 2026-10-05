package com.irisdemo.ecommerce.controller;

import com.irisdemo.ecommerce.dto.ProductRequest;
import com.irisdemo.ecommerce.entity.Order;
import com.irisdemo.ecommerce.entity.OrderStatus;
import com.irisdemo.ecommerce.entity.Product;
import com.irisdemo.ecommerce.service.OrderService;
import com.irisdemo.ecommerce.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-only endpoints. Access restricted to ROLE_ADMIN in SecurityConfig
 * (.requestMatchers("/api/admin/**").hasRole("ADMIN")).
 * To become an admin, register a user then update their `role` column to ADMIN
 * (or seed one via data.sql / directly in the H2 console at /h2-console).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ProductService productService;
    private final OrderService orderService;

    // ---- Product management ----

    @PostMapping("/products")
    public ResponseEntity<Product> createProduct(@Valid @RequestBody ProductRequest request) {
        return new ResponseEntity<>(productService.createProduct(request), HttpStatus.CREATED);
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id,
                                                   @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Order oversight ----

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(@PathVariable Long id, @RequestParam OrderStatus status) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }
}
