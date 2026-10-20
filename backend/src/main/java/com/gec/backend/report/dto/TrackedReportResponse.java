package com.gec.backend.report.dto;

import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.report.entity.ReportStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Public report details remain accessible for the lifetime of the incident record,
 * including after every agency assignment is resolved.
 */
public record TrackedReportResponse(
    String publicReference,
    String categoryName,
    ReportStatus status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    Set<AgencyType> targetAgencyTypes,
    List<ReportStatusHistoryDto> statusHistory,
    String description,
    Double latitude,
    Double longitude,
    String locality,
    List<AgencyAssignmentDetailDto> agencyAssignments
) {
    public record ReportStatusHistoryDto(
        ReportStatus status,
        String note,
        LocalDateTime timestamp
    ) {}

    public record AgencyAssignmentDetailDto(
        String assignmentId,
        AgencyType agencyType,
        String agencyName,
        String stationId,
        String stationName,
        ReportStatus status,
        LocalDateTime assignedAt,
        LocalDateTime acknowledgedAt,
        LocalDateTime inProgressAt,
        LocalDateTime resolvedAt,
        AssignmentReviewDto review
    ) {}

    public record AssignmentReviewDto(
        String reviewId,
        short rating,
        Short responseSpeedRating,
        Short professionalismRating,
        Short helpfulnessRating,
        String comment,
        LocalDateTime createdAt
    ) {}
}
