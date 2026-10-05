package com.irisdemo.ecommerce.config;

import com.irisdemo.ecommerce.entity.Cart;
import com.irisdemo.ecommerce.entity.Role;
import com.irisdemo.ecommerce.entity.User;
import com.irisdemo.ecommerce.repository.CartRepository;
import com.irisdemo.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates a demo admin account on startup so you can hit /api/admin/** right away.
 * Login: username=admin, password=admin123
 * Runs after data.sql (product seed) has already populated the H2 in-memory DB.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.existsByUsername("admin")) {
            return;
        }

        User admin = User.builder()
                .username("admin")
                .email("admin@example.com")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN)
                .build();

        User savedAdmin = userRepository.save(admin);
        cartRepository.save(Cart.builder().user(savedAdmin).build());
    }
}
