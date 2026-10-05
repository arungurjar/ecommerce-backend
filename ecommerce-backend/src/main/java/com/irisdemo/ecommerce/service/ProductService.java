package com.irisdemo.ecommerce.service;

import com.irisdemo.ecommerce.dto.ProductRequest;
import com.irisdemo.ecommerce.entity.Product;
import com.irisdemo.ecommerce.exception.ResourceNotFoundException;
import com.irisdemo.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public Page<Product> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable);
    }

    public Page<Product> getByCategory(String category, Pageable pageable) {
        return productRepository.findByCategoryIgnoreCase(category, pageable);
    }

    public Page<Product> searchByName(String name, Pageable pageable) {
        return productRepository.findByNameContainingIgnoreCase(name, pageable);
    }

    public Product getById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    public Product createProduct(ProductRequest request) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .category(request.getCategory())
                .stockQuantity(request.getStockQuantity())
                .imageUrl(request.getImageUrl())
                .build();
        return productRepository.save(product);
    }

    public Product updateProduct(Long id, ProductRequest request) {
        Product product = getById(id);
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setCategory(request.getCategory());
        product.setStockQuantity(request.getStockQuantity());
        product.setImageUrl(request.getImageUrl());
        return productRepository.save(product);
    }

    public void deleteProduct(Long id) {
        Product product = getById(id);
        productRepository.delete(product);
    }
}
