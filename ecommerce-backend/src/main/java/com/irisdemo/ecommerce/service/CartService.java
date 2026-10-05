package com.irisdemo.ecommerce.service;

import com.irisdemo.ecommerce.dto.CartItemRequest;
import com.irisdemo.ecommerce.entity.Cart;
import com.irisdemo.ecommerce.entity.CartItem;
import com.irisdemo.ecommerce.entity.Product;
import com.irisdemo.ecommerce.entity.User;
import com.irisdemo.ecommerce.exception.BadRequestException;
import com.irisdemo.ecommerce.exception.ResourceNotFoundException;
import com.irisdemo.ecommerce.repository.CartItemRepository;
import com.irisdemo.ecommerce.repository.CartRepository;
import com.irisdemo.ecommerce.repository.ProductRepository;
import com.irisdemo.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    private Cart getOrCreateCart(String username) {
        User user = getUser(username);
        return cartRepository.findByUserId(user.getId())
                .orElseGet(() -> cartRepository.save(Cart.builder().user(user).build()));
    }

    public Cart getCart(String username) {
        return getOrCreateCart(username);
    }

    @Transactional
    public Cart addItem(String username, CartItemRequest request) {
        Cart cart = getOrCreateCart(username);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        if (product.getStockQuantity() < request.getQuantity()) {
            throw new BadRequestException("Not enough stock for product: " + product.getName());
        }

        CartItem existingItem = cartItemRepository
                .findByCartIdAndProductId(cart.getId(), product.getId())
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + request.getQuantity());
            cartItemRepository.save(existingItem);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .quantity(request.getQuantity())
                    .build();
            cart.getItems().add(newItem);
            cartItemRepository.save(newItem);
        }

        return cartRepository.findById(cart.getId()).orElseThrow();
    }

    @Transactional
    public Cart updateItemQuantity(String username, Long itemId, Integer quantity) {
        Cart cart = getOrCreateCart(username);
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + itemId));

        if (!item.getCart().getId().equals(cart.getId())) {
            throw new BadRequestException("This item does not belong to your cart");
        }

        if (quantity <= 0) {
            cart.getItems().remove(item);
            cartItemRepository.delete(item);
        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        return cartRepository.findById(cart.getId()).orElseThrow();
    }

    @Transactional
    public Cart removeItem(String username, Long itemId) {
        return updateItemQuantity(username, itemId, 0);
    }

    @Transactional
    public void clearCart(String username) {
        Cart cart = getOrCreateCart(username);
        cartItemRepository.deleteAll(cart.getItems());
        cart.getItems().clear();
        cartRepository.save(cart);
    }
}
