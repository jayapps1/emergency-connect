package com.gec.backend.messaging.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_notification")
public class StaffNotificationEntity {

    @Id
    private UUID id;

    @Column(name = "staff_user_id", nullable = false)
    private UUID staffUserId;

    @Column(name = "report_id")
    private UUID reportId;

    @Column(name = "assignment_id")
    private UUID assignmentId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public StaffNotificationEntity() {}

    public StaffNotificationEntity(
        UUID id,
        UUID staffUserId,
        UUID reportId,
        UUID assignmentId,
        String eventType,
        String title,
        String body
    ) {
        this.id = id;
        this.staffUserId = staffUserId;
        this.reportId = reportId;
        this.assignmentId = assignmentId;
        this.eventType = eventType;
        this.title = title;
        this.body = body;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getStaffUserId() { return staffUserId; }
    public void setStaffUserId(UUID staffUserId) { this.staffUserId = staffUserId; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public UUID getAssignmentId() { return assignmentId; }
    public void setAssignmentId(UUID assignmentId) { this.assignmentId = assignmentId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
