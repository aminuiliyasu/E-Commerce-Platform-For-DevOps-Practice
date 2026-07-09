package com.aminuiliyasu.ecommerce.user.service;

import com.aminuiliyasu.ecommerce.common.exception.BusinessException;
import com.aminuiliyasu.ecommerce.common.exception.ResourceNotFoundException;
import com.aminuiliyasu.ecommerce.security.AuthenticatedUser;
import com.aminuiliyasu.ecommerce.security.JwtService;
import com.aminuiliyasu.ecommerce.user.dto.*;
import com.aminuiliyasu.ecommerce.user.entity.Role;
import com.aminuiliyasu.ecommerce.user.entity.User;
import com.aminuiliyasu.ecommerce.user.entity.UserAddress;
import com.aminuiliyasu.ecommerce.user.repository.RoleRepository;
import com.aminuiliyasu.ecommerce.user.repository.UserAddressRepository;
import com.aminuiliyasu.ecommerce.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserAddressRepository addressRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("EMAIL_EXISTS", "Email is already registered", HttpStatus.CONFLICT);
        }
        Role customerRole = roleRepository.findByName("CUSTOMER")
                .orElseThrow(() -> new ResourceNotFoundException("Role", "CUSTOMER"));

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .roles(Set.of(customerRole))
                .enabled(true)
                .build();

        userRepository.save(user);
        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("INVALID_CREDENTIALS", "Invalid email or password", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException("INVALID_CREDENTIALS", "Invalid email or password", HttpStatus.UNAUTHORIZED);
        }
        if (!user.isEnabled()) {
            throw new BusinessException("ACCOUNT_DISABLED", "Account is disabled", HttpStatus.FORBIDDEN);
        }
        return buildAuthResponse(user);
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (!"refresh".equals(jwtService.extractTokenType(refreshToken))) {
            throw new BusinessException("INVALID_TOKEN", "Invalid refresh token", HttpStatus.UNAUTHORIZED);
        }
        String email = jwtService.extractEmail(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
        AuthenticatedUser authUser = toAuthenticatedUser(user);
        if (!jwtService.isTokenValid(refreshToken, authUser)) {
            throw new BusinessException("INVALID_TOKEN", "Refresh token expired", HttpStatus.UNAUTHORIZED);
        }
        return buildAuthResponse(user);
    }

    public UserResponse getProfile(Long userId) {
        return toUserResponse(getUserById(userId));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = getUserById(userId);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        return toUserResponse(userRepository.save(user));
    }

    public List<AddressResponse> getAddresses(Long userId) {
        return addressRepository.findByUserId(userId).stream()
                .map(this::toAddressResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AddressResponse addAddress(Long userId, AddressRequest request) {
        if (request.isDefault()) {
            clearDefaultAddresses(userId);
        }
        UserAddress address = UserAddress.builder()
                .userId(userId)
                .label(request.getLabel())
                .fullName(request.getFullName())
                .street(request.getStreet())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .country(request.getCountry())
                .phone(request.getPhone())
                .isDefault(request.isDefault())
                .build();
        return toAddressResponse(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse updateAddress(Long userId, Long addressId, AddressRequest request) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", String.valueOf(addressId)));
        if (request.isDefault()) {
            clearDefaultAddresses(userId);
        }
        address.setLabel(request.getLabel());
        address.setFullName(request.getFullName());
        address.setStreet(request.getStreet());
        address.setCity(request.getCity());
        address.setState(request.getState());
        address.setPostalCode(request.getPostalCode());
        address.setCountry(request.getCountry());
        address.setPhone(request.getPhone());
        address.setDefault(request.isDefault());
        return toAddressResponse(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", String.valueOf(addressId)));
        addressRepository.delete(address);
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", String.valueOf(id)));
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return toAuthenticatedUser(user);
    }

    public AuthenticatedUser toAuthenticatedUser(User user) {
        List<String> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toList());
        return new AuthenticatedUser(
                user.getId(), user.getEmail(), user.getPassword(),
                user.getFirstName(), user.getLastName(), roles, user.isEnabled()
        );
    }

    private AuthResponse buildAuthResponse(User user) {
        AuthenticatedUser authUser = toAuthenticatedUser(user);
        return AuthResponse.builder()
                .accessToken(jwtService.generateAccessToken(authUser))
                .refreshToken(jwtService.generateRefreshToken(authUser))
                .user(toUserResponse(user))
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .build();
    }

    private AddressResponse toAddressResponse(UserAddress address) {
        return AddressResponse.builder()
                .id(address.getId())
                .label(address.getLabel())
                .fullName(address.getFullName())
                .street(address.getStreet())
                .city(address.getCity())
                .state(address.getState())
                .postalCode(address.getPostalCode())
                .country(address.getCountry())
                .phone(address.getPhone())
                .isDefault(address.isDefault())
                .build();
    }

    private void clearDefaultAddresses(Long userId) {
        addressRepository.findByUserId(userId).forEach(addr -> {
            addr.setDefault(false);
            addressRepository.save(addr);
        });
    }
}
