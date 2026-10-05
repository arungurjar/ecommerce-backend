package com.irisdemo.ecommerce.controller;

import com.irisdemo.ecommerce.entity.Order;
import com.irisdemo.ecommerce.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** Places an order from whatever is currently in the caller's cart. */
    @PostMapping
    public ResponseEntity<Order> placeOrder(Authentication authentication) {
        return new ResponseEntity<>(orderService.placeOrder(authentication.getName()), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Order>> getMyOrders(Authentication authentication) {
        return ResponseEntity.ok(orderService.getOrderHistory(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(Authentication authentication, @PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id, authentication.getName()));
    }
}
