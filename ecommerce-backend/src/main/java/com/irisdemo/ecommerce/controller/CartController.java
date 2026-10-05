package com.irisdemo.ecommerce.controller;

import com.irisdemo.ecommerce.dto.CartItemRequest;
import com.irisdemo.ecommerce.entity.Cart;
import com.irisdemo.ecommerce.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * All endpoints here require a valid JWT (see SecurityConfig: anyRequest().authenticated()).
 * The logged-in username is pulled straight off the Authentication principal set by JwtAuthFilter.
 */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<Cart> getCart(Authentication authentication) {
        return ResponseEntity.ok(cartService.getCart(authentication.getName()));
    }

    @PostMapping("/items")
    public ResponseEntity<Cart> addItem(Authentication authentication,
                                         @Valid @RequestBody CartItemRequest request) {
        return ResponseEntity.ok(cartService.addItem(authentication.getName(), request));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<Cart> updateItem(Authentication authentication,
                                            @PathVariable Long itemId,
                                            @RequestParam Integer quantity) {
        return ResponseEntity.ok(cartService.updateItemQuantity(authentication.getName(), itemId, quantity));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Cart> removeItem(Authentication authentication, @PathVariable Long itemId) {
        return ResponseEntity.ok(cartService.removeItem(authentication.getName(), itemId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(Authentication authentication) {
        cartService.clearCart(authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
