package com.gec.backend.appliance.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "response_appliance")
public class ResponseApplianceEntity {

    @Id
    private UUID id;

    @Column(name = "agency_id", nullable = false)
    private UUID agencyId;

    @Column(name = "home_station_id", nullable = false)
    private UUID homeStationId;

    @Column(name = "current_station_id")
    private UUID currentStationId;

    @Column(name = "resource_type", nullable = false)
    private String resourceType;

    @Column(name = "call_sign", nullable = false, unique = true)
    private String callSign;

    @Column(name = "registration_number")
    private String registrationNumber;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "operational_status", nullable = false)
    private String operationalStatus = "AVAILABLE";

    @Column(name = "status_reason")
    private String statusReason;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public ResponseApplianceEntity() {}

    public ResponseApplianceEntity(
        UUID id,
        UUID agencyId,
        UUID homeStationId,
        UUID currentStationId,
        String resourceType,
        String callSign,
        String registrationNumber,
        String displayName,
        String operationalStatus
    ) {
        this.id = id;
        this.agencyId = agencyId;
        this.homeStationId = homeStationId;
        this.currentStationId = currentStationId;
        this.resourceType = resourceType;
        this.callSign = callSign;
        this.registrationNumber = registrationNumber;
        this.displayName = displayName;
        this.operationalStatus = operationalStatus != null ? operationalStatus : "AVAILABLE";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getAgencyId() { return agencyId; }
    public void setAgencyId(UUID agencyId) { this.agencyId = agencyId; }
    public UUID getHomeStationId() { return homeStationId; }
    public void setHomeStationId(UUID homeStationId) { this.homeStationId = homeStationId; }
    public UUID getCurrentStationId() { return currentStationId; }
    public void setCurrentStationId(UUID currentStationId) { this.currentStationId = currentStationId; }
    
    public UUID getEffectiveStationId() {
        return currentStationId != null ? currentStationId : homeStationId;
    }

    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public String getCallSign() { return callSign; }
    public void setCallSign(String callSign) { this.callSign = callSign; }
    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getOperationalStatus() { return operationalStatus; }
    public void setOperationalStatus(String operationalStatus) { this.operationalStatus = operationalStatus; }
    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
