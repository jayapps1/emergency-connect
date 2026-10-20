package com.gec.backend.publicuser.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "public_user")
public class PublicUserEntity {

    @Id
    private UUID id;

    @Column(name = "phone_number_normalized", nullable = false, unique = true)
    private String phoneNumberNormalized;

    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified = false;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(name = "totp_enabled", nullable = false)
    private boolean totpEnabled = false;

    @Column(name = "totp_secret_encrypted")
    private String totpSecretEncrypted;

    @Column(name = "totp_enabled_at")
    private LocalDateTime totpEnabledAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    public PublicUserEntity() {}

    public PublicUserEntity(UUID id, String phoneNumberNormalized, boolean phoneVerified) {
        this.id = id;
        this.phoneNumberNormalized = phoneNumberNormalized;
        this.phoneVerified = phoneVerified;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getPhoneNumberNormalized() { return phoneNumberNormalized; }
    public void setPhoneNumberNormalized(String phoneNumberNormalized) { this.phoneNumberNormalized = phoneNumberNormalized; }
    public boolean isPhoneVerified() { return phoneVerified; }
    public void setPhoneVerified(boolean phoneVerified) { this.phoneVerified = phoneVerified; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isTotpEnabled() { return totpEnabled; }
    public void setTotpEnabled(boolean totpEnabled) { this.totpEnabled = totpEnabled; }
    public String getTotpSecretEncrypted() { return totpSecretEncrypted; }
    public void setTotpSecretEncrypted(String totpSecretEncrypted) { this.totpSecretEncrypted = totpSecretEncrypted; }
    public LocalDateTime getTotpEnabledAt() { return totpEnabledAt; }
    public void setTotpEnabledAt(LocalDateTime totpEnabledAt) { this.totpEnabledAt = totpEnabledAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }
}
