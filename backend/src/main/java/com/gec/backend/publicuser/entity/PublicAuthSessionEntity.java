package com.gec.backend.publicuser.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "public_auth_session")
public class PublicAuthSessionEntity {

    @Id
    private UUID id;

    @Column(name = "public_user_id", nullable = false)
    private UUID publicUserId;

    @Column(name = "app_installation_id")
    private String appInstallationId;

    @Column(name = "refresh_token_hash", nullable = false, unique = true)
    private String refreshTokenHash;

    @Column(name = "device_label")
    private String deviceLabel;

    @Column(nullable = false)
    private String platform = "Android";

    @Column(name = "app_version")
    private String appVersion;

    @Column(name = "last_used_at", nullable = false)
    private LocalDateTime lastUsedAt = LocalDateTime.now();

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "revoked_reason")
    private String revokedReason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public PublicAuthSessionEntity() {}

    public PublicAuthSessionEntity(
        UUID id,
        UUID publicUserId,
        String appInstallationId,
        String refreshTokenHash,
        String deviceLabel,
        LocalDateTime expiresAt
    ) {
        this.id = id;
        this.publicUserId = publicUserId;
        this.appInstallationId = appInstallationId;
        this.refreshTokenHash = refreshTokenHash;
        this.deviceLabel = deviceLabel;
        this.expiresAt = expiresAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPublicUserId() { return publicUserId; }
    public void setPublicUserId(UUID publicUserId) { this.publicUserId = publicUserId; }
    public String getAppInstallationId() { return appInstallationId; }
    public void setAppInstallationId(String appInstallationId) { this.appInstallationId = appInstallationId; }
    public String getRefreshTokenHash() { return refreshTokenHash; }
    public void setRefreshTokenHash(String refreshTokenHash) { this.refreshTokenHash = refreshTokenHash; }
    public String getDeviceLabel() { return deviceLabel; }
    public void setDeviceLabel(String deviceLabel) { this.deviceLabel = deviceLabel; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getAppVersion() { return appVersion; }
    public void setAppVersion(String appVersion) { this.appVersion = appVersion; }
    public LocalDateTime getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(LocalDateTime lastUsedAt) { this.lastUsedAt = lastUsedAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getRevokedAt() { return revokedAt; }
    public void setRevokedAt(LocalDateTime revokedAt) { this.revokedAt = revokedAt; }
    public String getRevokedReason() { return revokedReason; }
    public void setRevokedReason(String revokedReason) { this.revokedReason = revokedReason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
