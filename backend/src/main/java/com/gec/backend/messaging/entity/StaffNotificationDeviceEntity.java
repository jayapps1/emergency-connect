package com.gec.backend.messaging.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_notification_device")
public class StaffNotificationDeviceEntity {

    @Id
    private UUID id;

    @Column(name = "staff_user_id", nullable = false)
    private UUID staffUserId;

    @Column(name = "installation_id", nullable = false)
    private String installationId;

    @Column(nullable = false)
    private String platform = "ANDROID";

    @Column(name = "push_token", nullable = false)
    private String pushToken;

    @Column(name = "device_label")
    private String deviceLabel;

    @Column(name = "app_version")
    private String appVersion;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt = LocalDateTime.now();

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    public StaffNotificationDeviceEntity() {}

    public StaffNotificationDeviceEntity(
        UUID id,
        UUID staffUserId,
        String installationId,
        String platform,
        String pushToken,
        String deviceLabel,
        String appVersion
    ) {
        this.id = id;
        this.staffUserId = staffUserId;
        this.installationId = installationId;
        this.platform = platform != null ? platform : "ANDROID";
        this.pushToken = pushToken;
        this.deviceLabel = deviceLabel;
        this.appVersion = appVersion;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getStaffUserId() { return staffUserId; }
    public void setStaffUserId(UUID staffUserId) { this.staffUserId = staffUserId; }
    public String getInstallationId() { return installationId; }
    public void setInstallationId(String installationId) { this.installationId = installationId; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getPushToken() { return pushToken; }
    public void setPushToken(String pushToken) { this.pushToken = pushToken; }
    public String getDeviceLabel() { return deviceLabel; }
    public void setDeviceLabel(String deviceLabel) { this.deviceLabel = deviceLabel; }
    public String getAppVersion() { return appVersion; }
    public void setAppVersion(String appVersion) { this.appVersion = appVersion; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }
    public LocalDateTime getRevokedAt() { return revokedAt; }
    public void setRevokedAt(LocalDateTime revokedAt) { this.revokedAt = revokedAt; }
}
