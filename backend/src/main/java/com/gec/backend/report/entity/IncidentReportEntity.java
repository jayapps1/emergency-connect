package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "incident_report")
public class IncidentReportEntity {

    @Id
    private UUID id;

    @Column(name = "public_reference", nullable = false, unique = true)
    private String publicReference;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_mode", nullable = false)
    private ReportMode reportMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;

    private String description;

    @Column(name = "anonymous_session_id")
    private String anonymousSessionId;

    @Column(name = "reporter_public_user_id")
    private UUID reporterPublicUserId;

    @Column(name = "installation_id")
    private UUID installationId;

    @Column(name = "tracking_token_hash")
    private String trackingTokenHash;

    @Column(name = "client_generated_request_id", unique = true)
    private UUID clientGeneratedRequestId;

    private Double latitude;
    private Double longitude;
    private Double locationAccuracyMeters;

    private String landmark;
    private String locality;
    private String district;
    private String region;

    @Column(name = "vehicle_registration_number")
    private String vehicleRegistrationNumber;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Column(name = "vehicle_colour")
    private String vehicleColour;

    @Column(name = "direction_of_travel")
    private String directionOfTravel;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public IncidentReportEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getPublicReference() { return publicReference; }
    public void setPublicReference(String publicReference) { this.publicReference = publicReference; }
    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
    public ReportMode getReportMode() { return reportMode; }
    public void setReportMode(ReportMode reportMode) { this.reportMode = reportMode; }
    public IncidentSeverity getSeverity() { return severity; }
    public void setSeverity(IncidentSeverity severity) { this.severity = severity; }
    public ReportStatus getStatus() { return status; }
    public void setStatus(ReportStatus status) { this.status = status; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getAnonymousSessionId() { return anonymousSessionId; }
    public void setAnonymousSessionId(String anonymousSessionId) { this.anonymousSessionId = anonymousSessionId; }
    public UUID getReporterPublicUserId() { return reporterPublicUserId; }
    public void setReporterPublicUserId(UUID reporterPublicUserId) { this.reporterPublicUserId = reporterPublicUserId; }
    public UUID getInstallationId() { return installationId; }
    public void setInstallationId(UUID installationId) { this.installationId = installationId; }
    public String getTrackingTokenHash() { return trackingTokenHash; }
    public void setTrackingTokenHash(String trackingTokenHash) { this.trackingTokenHash = trackingTokenHash; }
    public UUID getClientGeneratedRequestId() { return clientGeneratedRequestId; }
    public void setClientGeneratedRequestId(UUID clientGeneratedRequestId) { this.clientGeneratedRequestId = clientGeneratedRequestId; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public Double getLocationAccuracyMeters() { return locationAccuracyMeters; }
    public void setLocationAccuracyMeters(Double locationAccuracyMeters) { this.locationAccuracyMeters = locationAccuracyMeters; }
    public String getLandmark() { return landmark; }
    public void setLandmark(String landmark) { this.landmark = landmark; }
    public String getLocality() { return locality; }
    public void setLocality(String locality) { this.locality = locality; }
    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getVehicleRegistrationNumber() { return vehicleRegistrationNumber; }
    public void setVehicleRegistrationNumber(String vehicleRegistrationNumber) { this.vehicleRegistrationNumber = vehicleRegistrationNumber; }
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
    public String getVehicleColour() { return vehicleColour; }
    public void setVehicleColour(String vehicleColour) { this.vehicleColour = vehicleColour; }
    public String getDirectionOfTravel() { return directionOfTravel; }
    public void setDirectionOfTravel(String directionOfTravel) { this.directionOfTravel = directionOfTravel; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
