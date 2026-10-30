package com.gec.backend.admin.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ResponderAssignmentResponseDto {

    private UUID id;
    private UUID reportAssignmentId;
    private UUID reportId;
    private String publicReference;
    private String categoryName;
    private UUID responderUserId;
    private String responderName;
    private String responderEmail;
    private String responderRole;
    private UUID stationId;
    private String stationName;
    private LocalDateTime assignedAt;
    private LocalDateTime releasedAt;
    private boolean active;

    public ResponderAssignmentResponseDto() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportAssignmentId() { return reportAssignmentId; }
    public void setReportAssignmentId(UUID reportAssignmentId) { this.reportAssignmentId = reportAssignmentId; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public String getPublicReference() { return publicReference; }
    public void setPublicReference(String publicReference) { this.publicReference = publicReference; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public UUID getResponderUserId() { return responderUserId; }
    public void setResponderUserId(UUID responderUserId) { this.responderUserId = responderUserId; }
    public String getResponderName() { return responderName; }
    public void setResponderName(String responderName) { this.responderName = responderName; }
    public String getResponderEmail() { return responderEmail; }
    public void setResponderEmail(String responderEmail) { this.responderEmail = responderEmail; }
    public String getResponderRole() { return responderRole; }
    public void setResponderRole(String responderRole) { this.responderRole = responderRole; }
    public UUID getStationId() { return stationId; }
    public void setStationId(UUID stationId) { this.stationId = stationId; }
    public String getStationName() { return stationName; }
    public void setStationName(String stationName) { this.stationName = stationName; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
    public LocalDateTime getReleasedAt() { return releasedAt; }
    public void setReleasedAt(LocalDateTime releasedAt) { this.releasedAt = releasedAt; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
