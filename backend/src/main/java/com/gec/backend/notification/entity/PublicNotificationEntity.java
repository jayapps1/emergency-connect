package com.gec.backend.notification.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing an in-app citizen notification for report status updates and security alerts.
 *
 * <p>Mapping Note:
 * The domain property {@code read} is explicitly mapped to database column {@code is_read}
 * to match the Flyway schema migration constraint and avoid ambiguous SQL keyword usage.
 */
@Entity
@Table(name = "public_notification")
public class PublicNotificationEntity {

    @Id
    private UUID id;

    @Column(name = "public_user_id", nullable = false)
    private UUID publicUserId;

    @Column(name = "report_id")
    private UUID reportId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public PublicNotificationEntity() {}

    public PublicNotificationEntity(UUID id, UUID publicUserId, UUID reportId, String eventType, String title, String message) {
        this.id = id;
        this.publicUserId = publicUserId;
        this.reportId = reportId;
        this.eventType = eventType;
        this.title = title;
        this.message = message;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPublicUserId() { return publicUserId; }
    public void setPublicUserId(UUID publicUserId) { this.publicUserId = publicUserId; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
