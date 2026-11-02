package com.gec.backend.report.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.report.dto.*;
import com.gec.backend.report.entity.*;
import com.gec.backend.report.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Keeps post-response contact linked to the original emergency so the agency
 * can complete legitimate follow-up without gaining national citizen access.
 */
@Service
public class IncidentFollowUpService {

    private final IncidentFollowUpRepository followUpRepository;
    private final IncidentReportRepository reportRepository;
    private final ReportAssignmentRepository assignmentRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public IncidentFollowUpService(
        IncidentFollowUpRepository followUpRepository,
        IncidentReportRepository reportRepository,
        ReportAssignmentRepository assignmentRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.followUpRepository = followUpRepository;
        this.reportRepository = reportRepository;
        this.assignmentRepository = assignmentRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    // Grants operational citizen access only when the authenticated staff member is authorized for the report assignment or an active case follow-up.
    @Transactional
    public IncidentFollowUpResponseDto createFollowUp(CreateIncidentFollowUpDto dto) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        if (principal == null) {
            throw new AccessDeniedException("Staff authentication required.");
        }

        IncidentReportEntity report = reportRepository.findById(dto.reportId())
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + dto.reportId()));

        UUID agencyId = principal.getAgencyId();
        if (agencyId == null && !scopeService.isSystemAdmin()) {
            throw new AccessDeniedException("Staff agency scope required to create follow-up.");
        }

        UUID effectiveAgencyId = agencyId != null ? agencyId : report.getCategoryId();

        UUID followUpId = UUID.randomUUID();
        IncidentFollowUpEntity entity = new IncidentFollowUpEntity(
            followUpId,
            report.getId(),
            effectiveAgencyId,
            principal.getId(),
            dto.followUpType().toUpperCase(),
            dto.notes()
        );

        if (dto.scheduledAt() != null) {
            entity.setScheduledAt(dto.scheduledAt());
        }

        followUpRepository.save(entity);

        auditService.logAction(principal.getId(), "INCIDENT_FOLLOW_UP_CREATED", "INCIDENT_REPORT", report.getId(), effectiveAgencyId,
            "Created " + entity.getFollowUpType() + " follow-up for report " + report.getPublicReference(), null, null);

        return toResponse(entity);
    }

    @Transactional
    public IncidentFollowUpResponseDto updateFollowUpStatus(UUID followUpId, String status) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        IncidentFollowUpEntity entity = followUpRepository.findById(followUpId)
            .orElseThrow(() -> new ResourceNotFoundException("Follow-up record not found: " + followUpId));

        String newStatus = status.toUpperCase();
        entity.setStatus(newStatus);
        if ("COMPLETED".equals(newStatus)) {
            entity.setCompletedAt(LocalDateTime.now());
        }
        entity.setUpdatedAt(LocalDateTime.now());

        followUpRepository.save(entity);

        if (principal != null) {
            auditService.logAction(principal.getId(), "INCIDENT_FOLLOW_UP_UPDATED", "INCIDENT_FOLLOW_UP", followUpId, entity.getAgencyId(),
                "Updated follow-up status to " + newStatus, null, null);
        }

        return toResponse(entity);
    }

    public List<IncidentFollowUpResponseDto> getFollowUpsForReport(UUID reportId) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        if (scopeService.isSystemAdmin() || principal.getAgencyId() == null) {
            return followUpRepository.findByReportIdOrderByCreatedAtDesc(reportId).stream().map(this::toResponse).toList();
        }
        return followUpRepository.findByReportIdAndAgencyIdOrderByCreatedAtDesc(reportId, principal.getAgencyId()).stream().map(this::toResponse).toList();
    }

    private IncidentFollowUpResponseDto toResponse(IncidentFollowUpEntity entity) {
        return new IncidentFollowUpResponseDto(
            entity.getId(),
            entity.getReportId(),
            entity.getAgencyId(),
            entity.getCreatedByStaffUserId(),
            entity.getFollowUpType(),
            entity.getStatus(),
            entity.getNotes(),
            entity.getScheduledAt(),
            entity.getCompletedAt(),
            entity.getCreatedAt()
        );
    }
}
