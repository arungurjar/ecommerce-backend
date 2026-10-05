package com.irisdemo.ecommerce.service;

import com.irisdemo.ecommerce.entity.*;
import com.irisdemo.ecommerce.exception.BadRequestException;
import com.irisdemo.ecommerce.exception.ResourceNotFoundException;
import com.irisdemo.ecommerce.repository.CartItemRepository;
import com.irisdemo.ecommerce.repository.OrderRepository;
import com.irisdemo.ecommerce.repository.ProductRepository;
import com.irisdemo.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartService cartService;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public Order placeOrder(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Cart cart = cartService.getCart(username);

        if (cart.getItems().isEmpty()) {
            throw new BadRequestException("Cannot place an order with an empty cart");
        }

        // Validate stock for every item before committing anything
        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();
            if (product.getStockQuantity() < cartItem.getQuantity()) {
                throw new BadRequestException("Not enough stock for product: " + product.getName());
            }
        }

        Order order = Order.builder()
                .user(user)
                .totalAmount(BigDecimal.ZERO)
                .status(OrderStatus.PLACED)
                .build();

        BigDecimal total = BigDecimal.ZERO;

        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(cartItem.getQuantity())
                    .priceAtPurchase(product.getPrice())
                    .build();

            order.getItems().add(orderItem);
            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));

            // decrement stock
            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
            productRepository.save(product);
        }

        order.setTotalAmount(total);
        Order savedOrder = orderRepository.save(order);

        // clear the cart after order is placed
        cartItemRepository.deleteAll(cart.getItems());
        cart.getItems().clear();

        return savedOrder;
    }

    public List<Order> getOrderHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    public Order getOrderById(Long orderId, String username) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (!order.getUser().getUsername().equals(username)) {
            throw new BadRequestException("This order does not belong to you");
        }
        return order;
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @Transactional
    public Order updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        order.setStatus(status);
        return orderRepository.save(order);
    }
}
