package com.gec.backend.publicuser.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_installation")
public class AppInstallationEntity {

    @Id
    private UUID id;

    @Column(name = "installation_public_id", nullable = false, unique = true)
    private String installationPublicId;

    @Column(name = "public_user_id")
    private UUID publicUserId;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt = LocalDateTime.now();

    public AppInstallationEntity() {}

    public AppInstallationEntity(UUID id, String installationPublicId, UUID publicUserId) {
        this.id = id;
        this.installationPublicId = installationPublicId;
        this.publicUserId = publicUserId;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getInstallationPublicId() { return installationPublicId; }
    public void setInstallationPublicId(String installationPublicId) { this.installationPublicId = installationPublicId; }
    public UUID getPublicUserId() { return publicUserId; }
    public void setPublicUserId(UUID publicUserId) { this.publicUserId = publicUserId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
