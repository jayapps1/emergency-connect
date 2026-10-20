package com.gec.backend.publicuser.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "public_security_event")
public class PublicSecurityEventEntity {

    @Id
    private UUID id;

    @Column(name = "public_user_id", nullable = false)
    private UUID publicUserId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "device_label")
    private String deviceLabel;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public PublicSecurityEventEntity() {}

    public PublicSecurityEventEntity(UUID id, UUID publicUserId, String eventType, String deviceLabel, String message) {
        this.id = id;
        this.publicUserId = publicUserId;
        this.eventType = eventType;
        this.deviceLabel = deviceLabel;
        this.message = message;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPublicUserId() { return publicUserId; }
    public void setPublicUserId(UUID publicUserId) { this.publicUserId = publicUserId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getDeviceLabel() { return deviceLabel; }
    public void setDeviceLabel(String deviceLabel) { this.deviceLabel = deviceLabel; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
