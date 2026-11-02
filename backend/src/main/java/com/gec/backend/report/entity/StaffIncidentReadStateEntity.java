package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_incident_read_state", uniqueConstraints = {
    @UniqueConstraint(name = "uk_staff_incident_read", columnNames = {"staff_user_id", "report_id"})
})
public class StaffIncidentReadStateEntity {

    @Id
    private UUID id;

    @Column(name = "staff_user_id", nullable = false)
    private UUID staffUserId;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "read_at", nullable = false)
    private LocalDateTime readAt = LocalDateTime.now();

    public StaffIncidentReadStateEntity() {}

    public StaffIncidentReadStateEntity(UUID id, UUID staffUserId, UUID reportId) {
        this.id = id;
        this.staffUserId = staffUserId;
        this.reportId = reportId;
        this.readAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getStaffUserId() { return staffUserId; }
    public void setStaffUserId(UUID staffUserId) { this.staffUserId = staffUserId; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
