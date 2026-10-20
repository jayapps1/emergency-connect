package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.notification.service.PublicNotificationService;
import com.gec.backend.report.dto.ReportAttachmentResponseDto;
import com.gec.backend.report.entity.*;
import com.gec.backend.report.repository.*;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminReportWorkflowService {

    private final IncidentReportRepository reportRepository;
    private final IncidentCategoryRepository categoryRepository;
    private final ReportAssignmentRepository assignmentRepository;
    private final ReportStatusHistoryRepository historyRepository;
    private final ReportAttachmentRepository attachmentRepository;
    private final AgencyRepository agencyRepository;
    private final StationRepository stationRepository;
    private final PublicNotificationService publicNotificationService;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public AdminReportWorkflowService(
        IncidentReportRepository reportRepository,
        IncidentCategoryRepository categoryRepository,
        ReportAssignmentRepository assignmentRepository,
        ReportStatusHistoryRepository historyRepository,
        ReportAttachmentRepository attachmentRepository,
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        PublicNotificationService publicNotificationService,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.reportRepository = reportRepository;
        this.categoryRepository = categoryRepository;
        this.assignmentRepository = assignmentRepository;
        this.historyRepository = historyRepository;
        this.attachmentRepository = attachmentRepository;
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.publicNotificationService = publicNotificationService;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public Page<AdminReportSummaryResponse> getReports(Pageable pageable) {
        if (scopeService.isSystemAdmin()) {
            return reportRepository.findAll(pageable).map(this::mapToSummary);
        } else {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            if (agencyId == null) {
                return Page.empty(pageable);
            }
            AgencyEntity agency = agencyRepository.findById(agencyId).orElse(null);
            if (agency == null) {
                return Page.empty(pageable);
            }

            Set<UUID> reportIds = assignmentRepository.findByAgencyType(agency.getType())
                .stream()
                .map(ReportAssignmentEntity::getReportId)
                .collect(Collectors.toSet());

            if (reportIds.isEmpty()) {
                return Page.empty(pageable);
            }

            return reportRepository.findByIdIn(reportIds, pageable).map(this::mapToSummary);
        }
    }

    public AdminReportDetailsResponse getReportDetails(UUID reportId) {
        IncidentReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));

        if (!scopeService.isSystemAdmin()) {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            AgencyEntity agency = agencyId != null ? agencyRepository.findById(agencyId).orElse(null) : null;
            if (agency != null) {
                boolean assigned = assignmentRepository.findByReportId(reportId)
                    .stream()
                    .anyMatch(a -> a.getAgencyType() == agency.getType());
                if (!assigned) {
                    throw new ResourceNotFoundException("Report not found: " + reportId);
                }
            }
        }

        IncidentCategoryEntity category = categoryRepository.findById(report.getCategoryId()).orElse(null);
        String catName = category != null ? category.getName() : "Incident";

        List<ReportAssignmentEntity> assignments = assignmentRepository.findByReportId(reportId);
        Set<AgencyType> targetAgencies = new HashSet<>();
        assignments.forEach(a -> targetAgencies.add(a.getAgencyType()));

        List<AdminReportDetailsResponse.AgencyAssignmentDto> assignmentDtos = assignments.stream().map(a -> {
            AgencyEntity agency = a.getAgencyId() != null ? agencyRepository.findById(a.getAgencyId()).orElse(null) : null;
            String agencyName = agency != null ? agency.getName() : a.getAgencyType().name();
            StationEntity station = a.getStationId() != null ? stationRepository.findById(a.getStationId()).orElse(null) : null;
            String stationName = station != null ? station.getName() : null;

            return new AdminReportDetailsResponse.AgencyAssignmentDto(
                a.getId(),
                a.getAgencyType(),
                a.getAgencyId(),
                agencyName,
                a.getStationId(),
                stationName,
                a.getStatus(),
                a.getAssignedAt(),
                a.getUpdatedAt()
            );
        }).toList();

        List<AdminReportDetailsResponse.StatusHistoryDto> historyDtos = historyRepository
            .findByReportIdOrderByCreatedAtAsc(reportId)
            .stream()
            .map(h -> new AdminReportDetailsResponse.StatusHistoryDto(h.getStatus(), h.getNote(), h.getCreatedAt()))
            .toList();

        List<ReportAttachmentResponseDto> attachmentDtos = attachmentRepository
            .findByReportIdOrderByCreatedAtAsc(reportId)
            .stream()
            .map(att -> new ReportAttachmentResponseDto(
                att.getId(),
                att.getReportId(),
                att.getMediaType(),
                att.getContentType(),
                att.getOriginalFileName(),
                att.getFileSizeBytes(),
                att.getCreatedAt()
            ))
            .toList();

        return new AdminReportDetailsResponse(
            report.getId(),
            report.getPublicReference(),
            report.getCategoryId(),
            catName,
            report.getReportMode(),
            report.getSeverity(),
            report.getStatus(),
            report.getDescription(),
            report.getLatitude(),
            report.getLongitude(),
            report.getLocationAccuracyMeters(),
            report.getLandmark(),
            report.getLocality(),
            report.getDistrict(),
            report.getRegion(),
            report.getVehicleRegistrationNumber(),
            report.getVehicleType(),
            report.getVehicleColour(),
            report.getDirectionOfTravel(),
            report.getCreatedAt(),
            report.getUpdatedAt(),
            targetAgencies,
            historyDtos,
            attachmentDtos,
            assignmentDtos
        );
    }

    @Transactional
    public AdminReportDetailsResponse acknowledgeReport(UUID reportId) {
        checkOperationalAccess();

        IncidentReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));

        ReportAssignmentEntity assignment = findAssignmentForCurrentActor(reportId);
        if (assignment.getStatus() == ReportStatus.RESOLVED) {
            throw new ResourceConflictException("This agency assignment has already been resolved and is locked.");
        }

        validateStatusTransition(assignment.getStatus(), ReportStatus.ACKNOWLEDGED);

        assignment.setStatus(ReportStatus.ACKNOWLEDGED);
        assignment.setUpdatedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);

        recalculateGlobalReportStatus(report);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        ReportStatusHistoryEntity history = new ReportStatusHistoryEntity(
            UUID.randomUUID(), reportId, ReportStatus.ACKNOWLEDGED, "Report acknowledged by " + assignment.getAgencyType().name() + " admin."
        );
        historyRepository.save(history);

        auditService.logAction(actorId, "REPORT_ACKNOWLEDGED", "INCIDENT_REPORT", reportId, scopeService.getCurrentPrincipal().getAgencyId(), "Acknowledged report " + report.getPublicReference(), null, null);

        return getReportDetails(reportId);
    }

    @Transactional
    public AdminReportDetailsResponse assignReport(UUID reportId, ReportAssignmentRequest request) {
        checkOperationalAccess();

        IncidentReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));

        ReportAssignmentEntity assignment = findAssignmentForCurrentActor(reportId);
        if (assignment.getStatus() == ReportStatus.RESOLVED) {
            throw new ResourceConflictException("This agency assignment has already been resolved and is locked.");
        }

        if (request.stationId() != null) {
            assignment.setStationId(request.stationId());
        }
        assignment.setUpdatedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        String note = request.note() != null ? request.note() : "Report assigned to station: " + request.stationId();

        ReportStatusHistoryEntity history = new ReportStatusHistoryEntity(
            UUID.randomUUID(), reportId, assignment.getStatus(), note
        );
        historyRepository.save(history);

        auditService.logAction(actorId, "REPORT_ASSIGNED", "INCIDENT_REPORT", reportId, scopeService.getCurrentPrincipal().getAgencyId(), "Assigned report " + report.getPublicReference(), null, null);

        return getReportDetails(reportId);
    }

    @Transactional
    public AdminReportDetailsResponse updateReportStatus(UUID reportId, ReportStatusUpdateRequest request) {
        checkOperationalAccess();

        IncidentReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));

        ReportAssignmentEntity assignment = findAssignmentForCurrentActor(reportId);
        if (assignment.getStatus() == ReportStatus.RESOLVED) {
            throw new ResourceConflictException("This agency assignment has already been resolved and is locked.");
        }

        validateStatusTransition(assignment.getStatus(), request.status());

        assignment.setStatus(request.status());
        assignment.setUpdatedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);

        recalculateGlobalReportStatus(report);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        String defaultNote = "Status updated to " + request.status().name() + " by " + assignment.getAgencyType().name();
        ReportStatusHistoryEntity history = new ReportStatusHistoryEntity(
            UUID.randomUUID(), reportId, request.status(), request.note() != null ? request.note() : defaultNote
        );
        historyRepository.save(history);

        auditService.logAction(actorId, "REPORT_STATUS_CHANGED", "INCIDENT_REPORT", reportId, scopeService.getCurrentPrincipal().getAgencyId(), "Status updated to " + request.status().name() + " for " + report.getPublicReference(), null, null);

        return getReportDetails(reportId);
    }

    @Transactional
    public AdminReportDetailsResponse transferReport(UUID reportId, ReportTransferRequest request) {
        checkOperationalAccess();

        IncidentReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));

        ReportAssignmentEntity assignment = findAssignmentForCurrentActor(reportId);
        if (assignment.getStatus() == ReportStatus.RESOLVED) {
            throw new ResourceConflictException("This agency assignment has already been resolved and is locked.");
        }

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        String note = request.note() != null ? request.note() : "Transferred report to agency: " + request.targetAgencyType().name();

        ReportAssignmentEntity newAssignment = new ReportAssignmentEntity(
            UUID.randomUUID(), reportId, request.targetAgencyType(), ReportStatus.ASSIGNED
        );
        List<AgencyEntity> targetAgencies = agencyRepository.findByTypeAndActiveTrue(request.targetAgencyType());
        if (!targetAgencies.isEmpty()) {
            newAssignment.setAgencyId(targetAgencies.get(0).getId());
        }
        assignmentRepository.save(newAssignment);

        ReportStatusHistoryEntity history = new ReportStatusHistoryEntity(
            UUID.randomUUID(), reportId, ReportStatus.TRANSFERRED, note
        );
        historyRepository.save(history);

        auditService.logAction(actorId, "REPORT_TRANSFERRED", "INCIDENT_REPORT", reportId, scopeService.getCurrentPrincipal().getAgencyId(), "Transferred report " + report.getPublicReference() + " to " + request.targetAgencyType().name(), null, null);

        return getReportDetails(reportId);
    }

    @Transactional
    public AdminReportDetailsResponse promptAgency(UUID reportId, String note) {
        if (!scopeService.isSystemAdmin()) {
            throw new IllegalArgumentException("Only System Administrators can issue oversight prompts.");
        }

        IncidentReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        String promptNote = "System Oversight Reminder: " + (note != null && !note.isBlank() ? note : "Please acknowledge and dispatch responsible units.");

        ReportStatusHistoryEntity history = new ReportStatusHistoryEntity(
            UUID.randomUUID(), reportId, report.getStatus(), promptNote
        );
        historyRepository.save(history);

        auditService.logAction(actorId, "REPORT_PROMPTED", "INCIDENT_REPORT", reportId, null, "Issued oversight prompt for " + report.getPublicReference(), null, null);

        return getReportDetails(reportId);
    }

    private void checkOperationalAccess() {
        if (scopeService.isSystemAdmin()) {
            throw new ResourceConflictException("System Administrators have oversight access only and cannot execute operational status updates.");
        }
    }

    private ReportAssignmentEntity findAssignmentForCurrentActor(UUID reportId) {
        UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
        List<ReportAssignmentEntity> assignments = assignmentRepository.findByReportId(reportId);

        if (agencyId != null) {
            AgencyEntity agency = agencyRepository.findById(agencyId).orElse(null);
            if (agency != null) {
                Optional<ReportAssignmentEntity> match = assignments.stream()
                    .filter(a -> a.getAgencyType() == agency.getType())
                    .findFirst();
                if (match.isPresent()) return match.get();
            }
        }

        if (!assignments.isEmpty()) return assignments.get(0);
        throw new ResourceNotFoundException("No assignment found for report: " + reportId);
    }

    private void recalculateGlobalReportStatus(IncidentReportEntity report) {
        List<ReportAssignmentEntity> assignments = assignmentRepository.findByReportId(report.getId());
        if (assignments.isEmpty()) return;

        ReportStatus previousStatus = report.getStatus();

        boolean allResolved = assignments.stream().allMatch(a -> a.getStatus() == ReportStatus.RESOLVED);
        boolean anyInProgress = assignments.stream().anyMatch(a -> a.getStatus() == ReportStatus.IN_PROGRESS);
        boolean anyAcknowledged = assignments.stream().anyMatch(a -> a.getStatus() == ReportStatus.ACKNOWLEDGED);

        ReportStatus newStatus = previousStatus;
        if (allResolved) {
            newStatus = ReportStatus.RESOLVED;
        } else if (anyInProgress) {
            newStatus = ReportStatus.IN_PROGRESS;
        } else if (anyAcknowledged) {
            newStatus = ReportStatus.ACKNOWLEDGED;
        }

        if (newStatus != previousStatus) {
            report.setStatus(newStatus);
            report.setUpdatedAt(LocalDateTime.now());
            reportRepository.save(report);

            try {
                publicNotificationService.notifyReportStatusChange(report, newStatus);
            } catch (Exception e) {
                // Public notification failure must never roll back status update
            }
        }
    }

    private void validateStatusTransition(ReportStatus current, ReportStatus target) {
        if (current == target) return;
        if (current == ReportStatus.RESOLVED) {
            throw new ResourceConflictException("This agency assignment has already been resolved and is locked.");
        }
        if (current == ReportStatus.CLOSED || current == ReportStatus.REJECTED) {
            throw new ResourceConflictException("Cannot transition from closed/rejected status " + current);
        }

        if (target == ReportStatus.ACKNOWLEDGED) {
            if (current != ReportStatus.SUBMITTED && current != ReportStatus.ASSIGNED && current != ReportStatus.DRAFT) {
                throw new ResourceConflictException("Invalid status transition from " + current + " to ACKNOWLEDGED.");
            }
        } else if (target == ReportStatus.IN_PROGRESS) {
            if (current != ReportStatus.ACKNOWLEDGED) {
                throw new ResourceConflictException("Invalid status transition from " + current + " to IN_PROGRESS. Incident must be ACKNOWLEDGED first.");
            }
        } else if (target == ReportStatus.RESOLVED) {
            if (current != ReportStatus.IN_PROGRESS) {
                throw new ResourceConflictException("Invalid status transition from " + current + " to RESOLVED. Incident must be IN_PROGRESS first.");
            }
        }
    }

    private AdminReportSummaryResponse mapToSummary(IncidentReportEntity report) {
        IncidentCategoryEntity category = categoryRepository.findById(report.getCategoryId()).orElse(null);
        String catName = category != null ? category.getName() : "Incident";

        List<ReportAssignmentEntity> assignments = assignmentRepository.findByReportId(report.getId());
        Set<AgencyType> targetAgencies = new HashSet<>();
        assignments.forEach(a -> targetAgencies.add(a.getAgencyType()));

        return new AdminReportSummaryResponse(
            report.getId(),
            report.getPublicReference(),
            report.getCategoryId(),
            catName,
            report.getReportMode(),
            report.getSeverity(),
            report.getStatus(),
            report.getCreatedAt(),
            targetAgencies
        );
    }
}
