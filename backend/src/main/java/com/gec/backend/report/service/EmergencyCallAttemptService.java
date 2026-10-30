package com.gec.backend.report.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.publicuser.security.PublicUserPrincipal;
import com.gec.backend.report.dto.*;
import com.gec.backend.report.entity.EmergencyCallAttemptEntity;
import com.gec.backend.report.repository.EmergencyCallAttemptRepository;
import com.gec.backend.station.entity.StationContactEntity;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.repository.StationContactRepository;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Records a citizen-initiated emergency call before the Android telecom
 * handoff. CALL_LAUNCHED confirms only that the operating system accepted the
 * call request; it does not imply that the destination answered.
 *
 * Emergency call attempts remain owned by the agency that received the
 * original citizen call. Authorization is derived from the authenticated
 * staff scope rather than client-supplied agency identifiers, preventing
 * cross-agency disclosure of operational call data.
 */
@Service
public class EmergencyCallAttemptService {

    private final EmergencyCallAttemptRepository callAttemptRepository;
    private final AgencyRepository agencyRepository;
    private final StationRepository stationRepository;
    private final StationContactRepository contactRepository;
    private final IncidentReportService reportService;
    private final AdminScopeService scopeService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public EmergencyCallAttemptService(
        EmergencyCallAttemptRepository callAttemptRepository,
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        StationContactRepository contactRepository,
        IncidentReportService reportService,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.callAttemptRepository = callAttemptRepository;
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.contactRepository = contactRepository;
        this.reportService = reportService;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    @Transactional
    public EmergencyCallAttemptResponse createCallAttempt(CreateEmergencyCallAttemptRequest request, String installationPublicId) {
        if (request.clientGeneratedRequestId() != null) {
            Optional<EmergencyCallAttemptEntity> existingOpt = callAttemptRepository.findByClientGeneratedRequestId(request.clientGeneratedRequestId());
            if (existingOpt.isPresent()) {
                return toResponse(existingOpt.get());
            }
        }

        AgencyEntity agency = agencyRepository.findById(request.agencyId())
            .orElseThrow(() -> new ResourceNotFoundException("Agency not found: " + request.agencyId()));

        String resolvedPhone = agency.getEmergencyNumber();
        String destType = request.destinationType() != null ? request.destinationType() : "AGENCY_SHORT_CODE";

        if (request.stationContactId() != null) {
            StationContactEntity contact = contactRepository.findById(request.stationContactId()).orElse(null);
            if (contact != null && contact.isPublicContact() && contact.isActive() && contact.isVerified()) {
                resolvedPhone = contact.getPhoneNumber();
                destType = "STATION_CONTACT";
            }
        } else if (request.stationId() != null) {
            StationEntity station = stationRepository.findByIdAndActiveTrueAndVerifiedTrue(request.stationId()).orElse(null);
            if (station != null) {
                List<StationContactEntity> contacts = contactRepository.findByStationIdAndPublicContactTrueAndActiveTrueAndVerifiedTrueOrderByPriorityAsc(station.getId());
                if (!contacts.isEmpty()) {
                    resolvedPhone = contacts.get(0).getPhoneNumber();
                    destType = "STATION_CONTACT";
                }
            }
        }

        UUID attemptId = UUID.randomUUID();
        String publicRef = generatePublicReference();
        LocalDateTime now = LocalDateTime.now();

        EmergencyCallAttemptEntity entity = new EmergencyCallAttemptEntity(
            attemptId,
            publicRef,
            agency.getId(),
            resolvedPhone,
            destType,
            now,
            "INITIATED"
        );

        entity.setStationId(request.stationId());
        entity.setStationContactId(request.stationContactId());
        entity.setInstallationPublicId(installationPublicId);
        entity.setLatitude(request.latitude());
        entity.setLongitude(request.longitude());
        entity.setLocationAccuracyMeters(request.accuracyMeters());
        if (request.latitude() != null && request.longitude() != null) {
            entity.setLocationCapturedAt(now);
        }
        entity.setClientGeneratedRequestId(request.clientGeneratedRequestId());

        if (SecurityContextHolder.getContext().getAuthentication() != null &&
            SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof PublicUserPrincipal p) {
            entity.setPublicUserId(p.getId());
        }

        callAttemptRepository.save(entity);

        return toResponse(entity);
    }

    @Transactional
    public EmergencyCallAttemptResponse markCallLaunched(UUID callAttemptId) {
        EmergencyCallAttemptEntity entity = callAttemptRepository.findById(callAttemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Call attempt not found: " + callAttemptId));

        entity.setStatus("CALL_LAUNCHED");
        entity.setCallLaunchedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());

        callAttemptRepository.save(entity);

        return toResponse(entity);
    }

    public Page<EmergencyCallAttemptResponse> getStaffCallAttempts(Pageable pageable) {
        validateStaffAccessNotResponder();
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();

        if (scopeService.isSystemAdmin()) {
            return callAttemptRepository.findAllByOrderByInitiatedAtDesc(pageable).map(this::toResponse);
        } else if (principal.getStationId() != null) {
            return callAttemptRepository.findByStationIdOrderByInitiatedAtDesc(principal.getStationId(), pageable).map(this::toResponse);
        } else if (principal.getAgencyId() != null) {
            return callAttemptRepository.findByAgencyIdOrderByInitiatedAtDesc(principal.getAgencyId(), pageable).map(this::toResponse);
        } else {
            throw new AccessDeniedException("Insufficient administrative scope to query call attempts.");
        }
    }

    public EmergencyCallAttemptResponse getStaffCallAttemptDetails(UUID callAttemptId) {
        validateStaffAccessNotResponder();
        EmergencyCallAttemptEntity entity = callAttemptRepository.findById(callAttemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Call attempt not found: " + callAttemptId));

        scopeService.validateAgencyScope(entity.getAgencyId());

        return toResponse(entity);
    }

    @Transactional
    public EmergencyCallAttemptResponse updateCallAttemptStatus(UUID callAttemptId, String status) {
        validateStaffAccessNotResponder();
        EmergencyCallAttemptEntity entity = callAttemptRepository.findById(callAttemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Call attempt not found: " + callAttemptId));

        scopeService.validateAgencyScope(entity.getAgencyId());

        entity.setStatus(status.toUpperCase());
        entity.setUpdatedAt(LocalDateTime.now());
        callAttemptRepository.save(entity);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "CALL_ATTEMPT_STATUS_UPDATED", "CALL_ATTEMPT", callAttemptId, entity.getAgencyId(), "Updated call attempt status to " + status, null, null);

        return toResponse(entity);
    }

    /**
     * Converts a confirmed emergency call attempt into the existing incident
     * workflow. Conversion is idempotent so concurrent staff actions cannot
     * create multiple incidents for the same call attempt.
     */
    @Transactional
    public EmergencyCallAttemptResponse convertCallAttemptToIncident(UUID callAttemptId, ConvertCallAttemptToIncidentRequest request) {
        validateStaffAccessNotResponder();
        EmergencyCallAttemptEntity entity = callAttemptRepository.findById(callAttemptId)
            .orElseThrow(() -> new ResourceNotFoundException("Call attempt not found: " + callAttemptId));

        scopeService.validateAgencyScope(entity.getAgencyId());

        if (entity.getLinkedReportId() != null) {
            throw new ResourceConflictException("CALL_ATTEMPT_ALREADY_LINKED: This call attempt has already been converted to an incident.");
        }

        LocationDto locationDto = null;
        if (entity.getLatitude() != null && entity.getLongitude() != null) {
            locationDto = new LocationDto(
                entity.getLatitude(),
                entity.getLongitude(),
                entity.getLocationAccuracyMeters(),
                "Emergency Call Initiation Location",
                null,
                null,
                null
            );
        }

        IncidentReportRequest reportRequest = new IncidentReportRequest(
            request.categoryId(),
            request.reportMode(),
            request.description() != null ? request.description() : "Operational incident converted from emergency call attempt " + entity.getPublicReference(),
            entity.getInstallationPublicId(),
            UUID.randomUUID(),
            locationDto,
            request.vehicleInfo()
        );

        IncidentReportResponse reportResponse = reportService.submitReport(reportRequest, entity.getInstallationPublicId());

        entity.setLinkedReportId(reportResponse.id());
        entity.setStatus("INCIDENT_CREATED");
        entity.setUpdatedAt(LocalDateTime.now());
        callAttemptRepository.save(entity);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "CALL_ATTEMPT_CONVERTED_TO_INCIDENT", "CALL_ATTEMPT", callAttemptId, entity.getAgencyId(),
            "Converted call attempt " + entity.getPublicReference() + " to incident " + reportResponse.publicReference(), null, null);

        return toResponse(entity);
    }

    private void validateStaffAccessNotResponder() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        if (principal == null) {
            throw new AccessDeniedException("Staff authentication is required.");
        }
        if (principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_RESPONDER"))) {
            throw new AccessDeniedException("RESPONDER role is restricted from inspecting unconfirmed raw call attempts.");
        }
    }

    private EmergencyCallAttemptResponse toResponse(EmergencyCallAttemptEntity entity) {
        return new EmergencyCallAttemptResponse(
            entity.getId(),
            entity.getPublicReference(),
            entity.getAgencyId(),
            entity.getStationId(),
            entity.getDestinationType(),
            entity.getDestinationPhone(),
            entity.getLatitude(),
            entity.getLongitude(),
            entity.getLocationAccuracyMeters(),
            entity.getStatus(),
            entity.getInitiatedAt(),
            entity.getCallLaunchedAt(),
            entity.getLinkedReportId(),
            entity.getCreatedAt()
        );
    }

    private String generatePublicReference() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = String.format("%06X", secureRandom.nextInt(0xFFFFFF));
        return "CAL-" + datePart + "-" + suffix;
    }
}
