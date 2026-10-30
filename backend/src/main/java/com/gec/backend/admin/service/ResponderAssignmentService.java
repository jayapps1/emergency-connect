package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.RoleEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.messaging.entity.StaffNotificationEntity;
import com.gec.backend.messaging.repository.StaffNotificationRepository;
import com.gec.backend.report.entity.IncidentCategoryEntity;
import com.gec.backend.report.entity.IncidentReportEntity;
import com.gec.backend.report.entity.ReportAssignmentEntity;
import com.gec.backend.report.entity.ResponderAssignmentEntity;
import com.gec.backend.report.repository.IncidentCategoryRepository;
import com.gec.backend.report.repository.IncidentReportRepository;
import com.gec.backend.report.repository.ReportAssignmentRepository;
import com.gec.backend.report.repository.ResponderAssignmentRepository;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ResponderAssignmentService {

    private final ResponderAssignmentRepository responderAssignmentRepository;
    private final ReportAssignmentRepository reportAssignmentRepository;
    private final IncidentReportRepository incidentReportRepository;
    private final IncidentCategoryRepository categoryRepository;
    private final AdminUserRepository adminUserRepository;
    private final StationRepository stationRepository;
    private final AgencyRepository agencyRepository;
    private final StaffNotificationRepository staffNotificationRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public ResponderAssignmentService(
        ResponderAssignmentRepository responderAssignmentRepository,
        ReportAssignmentRepository reportAssignmentRepository,
        IncidentReportRepository incidentReportRepository,
        IncidentCategoryRepository categoryRepository,
        AdminUserRepository adminUserRepository,
        StationRepository stationRepository,
        AgencyRepository agencyRepository,
        StaffNotificationRepository staffNotificationRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.responderAssignmentRepository = responderAssignmentRepository;
        this.reportAssignmentRepository = reportAssignmentRepository;
        this.incidentReportRepository = incidentReportRepository;
        this.categoryRepository = categoryRepository;
        this.adminUserRepository = adminUserRepository;
        this.stationRepository = stationRepository;
        this.agencyRepository = agencyRepository;
        this.staffNotificationRepository = staffNotificationRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<EligibleResponderResponseDto> getEligibleResponders(UUID reportId) {
        var principal = scopeService.getCurrentPrincipal();
        UUID callerAgencyId = principal.getAgencyId();

        ReportAssignmentEntity reportAssignment = findReportAssignmentForReportAndAgency(reportId, callerAgencyId);

        List<AdminUserEntity> agencyStaff = callerAgencyId != null ? adminUserRepository.findByAgencyId(callerAgencyId) : Collections.emptyList();

        List<ResponderAssignmentEntity> activeAssignments = responderAssignmentRepository.findByReportAssignmentIdAndActiveTrue(reportAssignment.getId());
        Set<UUID> activeAssignedUserIds = activeAssignments.stream()
                .map(ResponderAssignmentEntity::getResponderUserId)
                .collect(Collectors.toSet());

        return agencyStaff.stream()
                .filter(user -> user.isActive() && !user.isLocked())
                .filter(user -> user.getRoles().stream().anyMatch(role -> "RESPONDER".equalsIgnoreCase(role.getCode()) || "04010101".equals(role.getCode())))
                .map(user -> {
                    String stationName = user.getStationId() != null ?
                            stationRepository.findById(user.getStationId()).map(s -> s.getName()).orElse(null) : null;
                    String agencyName = callerAgencyId != null ?
                            agencyRepository.findById(callerAgencyId).map(a -> a.getName()).orElse(null) : null;

                    String primaryRole = user.getRoles().stream().findFirst().map(RoleEntity::getName).orElse("Responder");
                    boolean assigned = activeAssignedUserIds.contains(user.getId());

                    return new EligibleResponderResponseDto(
                            user.getId(),
                            user.getFirstName() + " " + user.getLastName(),
                            user.getEmail(),
                            primaryRole,
                            callerAgencyId,
                            agencyName,
                            user.getStationId(),
                            stationName,
                            user.isActive(),
                            assigned
                    );
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ResponderAssignmentResponseDto> getAssignedResponders(UUID reportId) {
        var principal = scopeService.getCurrentPrincipal();
        UUID callerAgencyId = principal.getAgencyId();

        ReportAssignmentEntity reportAssignment = findReportAssignmentForReportAndAgency(reportId, callerAgencyId);
        IncidentReportEntity report = incidentReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident report not found."));

        List<ResponderAssignmentEntity> assignments = responderAssignmentRepository.findByReportAssignmentId(reportAssignment.getId());

        return assignments.stream().map(assign -> mapToResponseDto(assign, reportAssignment, report)).collect(Collectors.toList());
    }

    @Transactional
    public ResponderAssignmentResponseDto assignResponder(UUID reportId, AssignResponderRequest request) {
        var principal = scopeService.getCurrentPrincipal();
        UUID callerAgencyId = principal.getAgencyId();

        boolean isSystemAdmin = principal.getAuthorities().stream().anyMatch(a -> "ROLE_SYSTEM_ADMIN".equals(a.getAuthority()));
        if (isSystemAdmin) {
            throw new AccessDeniedException("System Administrators maintain national oversight and do not dispatch operational responders.");
        }

        ReportAssignmentEntity reportAssignment = findReportAssignmentForReportAndAgency(reportId, callerAgencyId);
        IncidentReportEntity report = incidentReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident report not found."));

        AdminUserEntity responderUser = adminUserRepository.findById(request.getResponderUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Responder staff user not found."));

        if (!responderUser.isActive() || responderUser.isLocked()) {
            throw new ResourceConflictException("Cannot assign inactive or locked responder.");
        }

        if (callerAgencyId != null && !callerAgencyId.equals(responderUser.getAgencyId())) {
            throw new AccessDeniedException("Cross-agency responder assignment is strictly prohibited.");
        }

        if (responderAssignmentRepository.existsByReportAssignmentIdAndResponderUserIdAndActiveTrue(reportAssignment.getId(), responderUser.getId())) {
            throw new ResourceConflictException("RESPONDER_ALREADY_ASSIGNED: Responder is already actively assigned to this incident.");
        }

        ResponderAssignmentEntity entity = new ResponderAssignmentEntity(
                UUID.randomUUID(),
                reportAssignment.getId(),
                responderUser.getId(),
                principal.getId(),
                request.getNote()
        );
        entity = responderAssignmentRepository.save(entity);

        String categoryName = getCategoryName(report);

        // Persistent Staff Notification for Responder
        StaffNotificationEntity notification = new StaffNotificationEntity();
        notification.setId(UUID.randomUUID());
        notification.setStaffUserId(responderUser.getId());
        notification.setReportId(reportId);
        notification.setAssignmentId(reportAssignment.getId());
        notification.setEventType("RESPONDER_ASSIGNED");
        notification.setTitle("New Incident Assignment");
        notification.setBody("You have been assigned to emergency response " + report.getPublicReference() + " (" + categoryName + ").");
        notification.setCreatedAt(LocalDateTime.now());
        staffNotificationRepository.save(notification);

        auditService.logAction(principal.getId(), "RESPONDER_ASSIGNED", "REPORT", reportId, callerAgencyId, "Assigned responder " + responderUser.getEmail() + " to incident " + report.getPublicReference(), null, null);

        return mapToResponseDto(entity, reportAssignment, report);
    }

    @Transactional
    public void releaseResponder(UUID reportId, UUID responderAssignmentId) {
        var principal = scopeService.getCurrentPrincipal();
        UUID callerAgencyId = principal.getAgencyId();

        boolean isSystemAdmin = principal.getAuthorities().stream().anyMatch(a -> "ROLE_SYSTEM_ADMIN".equals(a.getAuthority()));
        if (isSystemAdmin) {
            throw new AccessDeniedException("System Administrators maintain national oversight and do not dispatch operational responders.");
        }

        ReportAssignmentEntity reportAssignment = findReportAssignmentForReportAndAgency(reportId, callerAgencyId);

        ResponderAssignmentEntity entity = responderAssignmentRepository.findByIdAndReportAssignmentId(responderAssignmentId, reportAssignment.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Responder assignment not found."));

        if (!entity.isActive()) {
            return;
        }

        entity.setActive(false);
        entity.setReleasedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        responderAssignmentRepository.save(entity);

        auditService.logAction(principal.getId(), "RESPONDER_RELEASED", "REPORT", reportId, callerAgencyId, "Released responder assignment " + responderAssignmentId + " on incident report " + reportId, null, null);
    }

    @Transactional(readOnly = true)
    public List<ResponderAssignmentResponseDto> getMyActiveAssignments() {
        var principal = scopeService.getCurrentPrincipal();
        UUID responderUserId = principal.getId();

        List<ResponderAssignmentEntity> activeAssignments = responderAssignmentRepository.findByResponderUserIdAndActiveTrue(responderUserId);

        return activeAssignments.stream().map(assign -> {
            ReportAssignmentEntity reportAssignment = reportAssignmentRepository.findById(assign.getReportAssignmentId()).orElse(null);
            if (reportAssignment == null) return null;
            IncidentReportEntity report = incidentReportRepository.findById(reportAssignment.getReportId()).orElse(null);
            if (report == null) return null;
            return mapToResponseDto(assign, reportAssignment, report);
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

    private ReportAssignmentEntity findReportAssignmentForReportAndAgency(UUID reportId, UUID agencyId) {
        List<ReportAssignmentEntity> assignments = reportAssignmentRepository.findByReportId(reportId);
        if (assignments.isEmpty()) {
            throw new ResourceNotFoundException("No report assignment found for incident " + reportId);
        }
        if (agencyId != null) {
            return assignments.stream().filter(a -> agencyId.equals(a.getAgencyId())).findFirst()
                    .orElse(assignments.get(0));
        }
        return assignments.get(0);
    }

    private String getCategoryName(IncidentReportEntity report) {
        if (report.getCategoryId() != null) {
            return categoryRepository.findById(report.getCategoryId()).map(IncidentCategoryEntity::getName).orElse("Emergency Incident");
        }
        return "Emergency Incident";
    }

    private ResponderAssignmentResponseDto mapToResponseDto(ResponderAssignmentEntity assign, ReportAssignmentEntity reportAssignment, IncidentReportEntity report) {
        ResponderAssignmentResponseDto dto = new ResponderAssignmentResponseDto();
        dto.setId(assign.getId());
        dto.setReportAssignmentId(reportAssignment.getId());
        dto.setReportId(report.getId());
        dto.setPublicReference(report.getPublicReference());
        dto.setCategoryName(getCategoryName(report));
        dto.setResponderUserId(assign.getResponderUserId());
        dto.setAssignedAt(assign.getAssignedAt());
        dto.setReleasedAt(assign.getReleasedAt());
        dto.setActive(assign.isActive());

        AdminUserEntity responder = adminUserRepository.findById(assign.getResponderUserId()).orElse(null);
        if (responder != null) {
            dto.setResponderName(responder.getFirstName() + " " + responder.getLastName());
            dto.setResponderEmail(responder.getEmail());
            dto.setResponderRole(responder.getRoles().stream().findFirst().map(RoleEntity::getName).orElse("Responder"));
            dto.setStationId(responder.getStationId());
            if (responder.getStationId() != null) {
                stationRepository.findById(responder.getStationId()).ifPresent(s -> dto.setStationName(s.getName()));
            }
        }
        return dto;
    }
}
