package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.LoginRequest;
import com.gec.backend.admin.dto.LoginResponse;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.repository.AdminRefreshTokenRepository;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

class AdminAuthServiceTest {

    private final AdminUserRepository userRepository = Mockito.mock(AdminUserRepository.class);
    private final AdminRefreshTokenRepository refreshTokenRepository = Mockito.mock(AdminRefreshTokenRepository.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtTokenProvider tokenProvider = new JwtTokenProvider("secretKeyForTestingMustBeAtLeast32BytesLong!", 900000);
    private final MfaService mfaService = Mockito.mock(MfaService.class);
    private final AuditService auditService = Mockito.mock(AuditService.class);

    private final AdminAuthService authService = new AdminAuthService(
        userRepository, refreshTokenRepository, passwordEncoder, tokenProvider, mfaService, auditService
    );

    @Test
    void login_success_returnsMfaChallenge() {
        UUID userId = UUID.randomUUID();
        AdminUserEntity user = new AdminUserEntity();
        user.setId(userId);
        user.setEmail("admin@gec.gov.gh");
        user.setPasswordHash(passwordEncoder.encode("Password123!"));
        user.setActive(true);
        user.setLocked(false);
        user.setRoles(Set.of());

        given(userRepository.findByEmailIgnoreCase("admin@gec.gov.gh")).willReturn(Optional.of(user));
        given(mfaService.createMfaChallenge(any())).willReturn("challenge_token_test");

        LoginRequest request = new LoginRequest("admin@gec.gov.gh", "Password123!");
        LoginResponse response = authService.login(request, "127.0.0.1", "JUnit");

        assertNotNull(response);
        assertEquals("MFA_SETUP_REQUIRED", response.authenticationState());
        assertEquals("challenge_token_test", response.mfaChallenge());
        assertEquals("admin@gec.gov.gh", response.user().email());
    }

    @Test
    void login_lockedUser_throwsBadCredentialsException() {
        AdminUserEntity user = new AdminUserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("locked@gec.gov.gh");
        user.setPasswordHash(passwordEncoder.encode("Password123!"));
        user.setActive(true);
        user.setLocked(true);

        given(userRepository.findByEmailIgnoreCase("locked@gec.gov.gh")).willReturn(Optional.of(user));

        LoginRequest request = new LoginRequest("locked@gec.gov.gh", "Password123!");

        assertThrows(BadCredentialsException.class, () -> {
            authService.login(request, "127.0.0.1", "JUnit");
        });
    }
}
