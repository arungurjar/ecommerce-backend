package com.irisdemo.ecommerce.service;

import com.irisdemo.ecommerce.dto.AuthResponse;
import com.irisdemo.ecommerce.dto.LoginRequest;
import com.irisdemo.ecommerce.dto.RegisterRequest;
import com.irisdemo.ecommerce.entity.Cart;
import com.irisdemo.ecommerce.entity.Role;
import com.irisdemo.ecommerce.entity.User;
import com.irisdemo.ecommerce.exception.BadRequestException;
import com.irisdemo.ecommerce.repository.CartRepository;
import com.irisdemo.ecommerce.repository.UserRepository;
import com.irisdemo.ecommerce.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final org.springframework.security.core.userdetails.UserDetailsService userDetailsService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();

        User savedUser = userRepository.save(user);

        // Every new user gets an empty cart ready to use
        Cart cart = Cart.builder().user(savedUser).build();
        cartRepository.save(cart);

        UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getUsername());
        String token = jwtUtil.generateToken(userDetails);

        return new AuthResponse(token, savedUser.getUsername(), savedUser.getRole().name());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadRequestException("Invalid username or password"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtUtil.generateToken(userDetails);

        return new AuthResponse(token, user.getUsername(), user.getRole().name());
    }
}
