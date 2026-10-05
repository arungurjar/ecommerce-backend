package com.irisdemo.ecommerce.controller;

import com.irisdemo.ecommerce.entity.Product;
import com.irisdemo.ecommerce.service.ProductService;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public, read-only product endpoints.
 * Anyone can browse/search products without logging in (see SecurityConfig).
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @SecurityRequirements
    @GetMapping
    public ResponseEntity<Page<Product>> getAllProducts(Pageable pageable) {
        return ResponseEntity.ok(productService.getAllProducts(pageable));
    }

    @SecurityRequirements
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    @SecurityRequirements
    @GetMapping("/category/{category}")
    public ResponseEntity<Page<Product>> getByCategory(@PathVariable String category, Pageable pageable) {
        return ResponseEntity.ok(productService.getByCategory(category, pageable));
    }

    @SecurityRequirements
    @GetMapping("/search")
    public ResponseEntity<Page<Product>> search(@RequestParam String name, Pageable pageable) {
        return ResponseEntity.ok(productService.searchByName(name, pageable));
    }
}
