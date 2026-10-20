package com.gec.backend.notification.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "push_device_registration")
public class PushDeviceRegistrationEntity {

    @Id
    private UUID id;

    @Column(name = "public_user_id")
    private UUID publicUserId;

    @Column(name = "app_installation_id")
    private String appInstallationId;

    @Column(nullable = false)
    private String provider = "FCM";

    @Column(name = "device_token", nullable = false, unique = true)
    private String deviceToken;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public PushDeviceRegistrationEntity() {}

    public PushDeviceRegistrationEntity(UUID id, UUID publicUserId, String appInstallationId, String deviceToken) {
        this.id = id;
        this.publicUserId = publicUserId;
        this.appInstallationId = appInstallationId;
        this.deviceToken = deviceToken;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPublicUserId() { return publicUserId; }
    public void setPublicUserId(UUID publicUserId) { this.publicUserId = publicUserId; }
    public String getAppInstallationId() { return appInstallationId; }
    public void setAppInstallationId(String appInstallationId) { this.appInstallationId = appInstallationId; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getDeviceToken() { return deviceToken; }
    public void setDeviceToken(String deviceToken) { this.deviceToken = deviceToken; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
