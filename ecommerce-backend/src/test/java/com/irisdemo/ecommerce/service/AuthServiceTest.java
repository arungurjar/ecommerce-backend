package com.irisdemo.ecommerce.service;

import com.irisdemo.ecommerce.dto.AuthResponse;
import com.irisdemo.ecommerce.dto.RegisterRequest;
import com.irisdemo.ecommerce.entity.Cart;
import com.irisdemo.ecommerce.entity.Role;
import com.irisdemo.ecommerce.entity.User;
import com.irisdemo.ecommerce.exception.BadRequestException;
import com.irisdemo.ecommerce.repository.CartRepository;
import com.irisdemo.ecommerce.repository.UserRepository;
import com.irisdemo.ecommerce.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private CartRepository cartRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtUtil jwtUtil;
    @Mock private UserDetailsService userDetailsService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        authService = new AuthService(userRepository, cartRepository, passwordEncoder,
                authenticationManager, jwtUtil, userDetailsService);
    }

    @Test
    void register_createsUserAndCartAndReturnsToken() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john");
        request.setEmail("john@example.com");
        request.setPassword("password123");

        when(userRepository.existsByUsername("john")).thenReturn(false);
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");

        User savedUser = User.builder()
                .id(1L).username("john").email("john@example.com")
                .password("hashed-password").role(Role.USER).build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(cartRepository.save(any(Cart.class))).thenReturn(new Cart());

        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername("john")
                .password("hashed-password")
                .authorities(List.of())
                .build();
        when(userDetailsService.loadUserByUsername("john")).thenReturn(userDetails);
        when(jwtUtil.generateToken(userDetails)).thenReturn("fake-jwt-token");

        AuthResponse response = authService.register(request);

        assertEquals("fake-jwt-token", response.getToken());
        assertEquals("john", response.getUsername());
        assertEquals("USER", response.getRole());
        verify(cartRepository, times(1)).save(any(Cart.class));
    }

    @Test
    void register_throwsWhenUsernameAlreadyTaken() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("john");
        request.setEmail("john@example.com");
        request.setPassword("password123");

        when(userRepository.existsByUsername("john")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_throwsWhenEmailAlreadyRegistered() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("newuser");
        request.setEmail("taken@example.com");
        request.setPassword("password123");

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(request));
    }
}
