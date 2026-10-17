package com.gec.backend.admin.dto;

import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.report.dto.ReportAttachmentResponseDto;
import com.gec.backend.report.entity.IncidentSeverity;
import com.gec.backend.report.entity.ReportMode;
import com.gec.backend.report.entity.ReportStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public record AdminReportDetailsResponse(
    UUID id,
    String publicReference,
    UUID categoryId,
    String categoryName,
    ReportMode mode,
    IncidentSeverity severity,
    ReportStatus status,
    String description,
    Double latitude,
    Double longitude,
    Double locationAccuracyMeters,
    String landmark,
    String locality,
    String district,
    String region,
    String vehicleRegistrationNumber,
    String vehicleType,
    String vehicleColour,
    String directionOfTravel,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    Set<AgencyType> targetAgencyTypes,
    List<StatusHistoryDto> statusHistory,
    List<ReportAttachmentResponseDto> attachments,
    List<AgencyAssignmentDto> agencyAssignments
) {
    public record StatusHistoryDto(
        ReportStatus status,
        String note,
        LocalDateTime timestamp
    ) {}

    public record AgencyAssignmentDto(
        UUID assignmentId,
        AgencyType agencyType,
        UUID agencyId,
        String agencyName,
        UUID stationId,
        String stationName,
        ReportStatus status,
        LocalDateTime assignedAt,
        LocalDateTime updatedAt
    ) {}
}
