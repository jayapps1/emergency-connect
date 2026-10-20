package com.gec.backend.admin.dto;

import java.util.Set;

public record LoginResponse(
    String accessToken,
    long expiresInSeconds,
    AdminUserResponse user,
    Set<String> roles,
    Set<String> permissions,
    String authenticationState,
    String mfaChallenge
) {
    public LoginResponse(String accessToken, long expiresInSeconds, AdminUserResponse user, Set<String> roles, Set<String> permissions) {
        this(accessToken, expiresInSeconds, user, roles, permissions, "AUTHENTICATED", null);
    }
}
