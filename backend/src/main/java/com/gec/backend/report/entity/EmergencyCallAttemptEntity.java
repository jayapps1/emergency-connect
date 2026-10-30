package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "emergency_call_attempt")
public class EmergencyCallAttemptEntity {

    @Id
    private UUID id;

    @Column(name = "public_reference", nullable = false, unique = true, length = 50)
    private String publicReference;

    @Column(name = "agency_id", nullable = false)
    private UUID agencyId;

    @Column(name = "station_id")
    private UUID stationId;

    @Column(name = "station_contact_id")
    private UUID stationContactId;

    @Column(name = "public_user_id")
    private UUID publicUserId;

    @Column(name = "installation_public_id", length = 100)
    private String installationPublicId;

    @Column(name = "destination_phone", nullable = false, length = 50)
    private String destinationPhone;

    @Column(name = "destination_type", nullable = false, length = 50)
    private String destinationType;

    private Double latitude;
    private Double longitude;

    @Column(name = "location_accuracy_meters")
    private Double locationAccuracyMeters;

    @Column(name = "location_captured_at")
    private LocalDateTime locationCapturedAt;

    @Column(name = "initiated_at", nullable = false)
    private LocalDateTime initiatedAt;

    @Column(name = "call_launched_at")
    private LocalDateTime callLaunchedAt;

    @Column(name = "client_generated_request_id", unique = true)
    private UUID clientGeneratedRequestId;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "linked_report_id")
    private UUID linkedReportId;

    @Column(name = "linked_report_assignment_id")
    private UUID linkedReportAssignmentId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public EmergencyCallAttemptEntity() {}

    public EmergencyCallAttemptEntity(
        UUID id,
        String publicReference,
        UUID agencyId,
        String destinationPhone,
        String destinationType,
        LocalDateTime initiatedAt,
        String status
    ) {
        this.id = id;
        this.publicReference = publicReference;
        this.agencyId = agencyId;
        this.destinationPhone = destinationPhone;
        this.destinationType = destinationType;
        this.initiatedAt = initiatedAt;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getPublicReference() { return publicReference; }
    public void setPublicReference(String publicReference) { this.publicReference = publicReference; }

    public UUID getAgencyId() { return agencyId; }
    public void setAgencyId(UUID agencyId) { this.agencyId = agencyId; }

    public UUID getStationId() { return stationId; }
    public void setStationId(UUID stationId) { this.stationId = stationId; }

    public UUID getStationContactId() { return stationContactId; }
    public void setStationContactId(UUID stationContactId) { this.stationContactId = stationContactId; }

    public UUID getPublicUserId() { return publicUserId; }
    public void setPublicUserId(UUID publicUserId) { this.publicUserId = publicUserId; }

    public String getInstallationPublicId() { return installationPublicId; }
    public void setInstallationPublicId(String installationPublicId) { this.installationPublicId = installationPublicId; }

    public String getDestinationPhone() { return destinationPhone; }
    public void setDestinationPhone(String destinationPhone) { this.destinationPhone = destinationPhone; }

    public String getDestinationType() { return destinationType; }
    public void setDestinationType(String destinationType) { this.destinationType = destinationType; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getLocationAccuracyMeters() { return locationAccuracyMeters; }
    public void setLocationAccuracyMeters(Double locationAccuracyMeters) { this.locationAccuracyMeters = locationAccuracyMeters; }

    public LocalDateTime getLocationCapturedAt() { return locationCapturedAt; }
    public void setLocationCapturedAt(LocalDateTime locationCapturedAt) { this.locationCapturedAt = locationCapturedAt; }

    public LocalDateTime getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(LocalDateTime initiatedAt) { this.initiatedAt = initiatedAt; }

    public LocalDateTime getCallLaunchedAt() { return callLaunchedAt; }
    public void setCallLaunchedAt(LocalDateTime callLaunchedAt) { this.callLaunchedAt = callLaunchedAt; }

    public UUID getClientGeneratedRequestId() { return clientGeneratedRequestId; }
    public void setClientGeneratedRequestId(UUID clientGeneratedRequestId) { this.clientGeneratedRequestId = clientGeneratedRequestId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public UUID getLinkedReportId() { return linkedReportId; }
    public void setLinkedReportId(UUID linkedReportId) { this.linkedReportId = linkedReportId; }

    public UUID getLinkedReportAssignmentId() { return linkedReportAssignmentId; }
    public void setLinkedReportAssignmentId(UUID linkedReportAssignmentId) { this.linkedReportAssignmentId = linkedReportAssignmentId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
