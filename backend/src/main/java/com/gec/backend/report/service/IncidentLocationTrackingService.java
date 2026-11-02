package com.gec.backend.report.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.publicuser.security.PublicUserPrincipal;
import com.gec.backend.report.dto.*;
import com.gec.backend.report.entity.*;
import com.gec.backend.report.repository.*;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Stores the citizen's latest consented location separately from the immutable
 * location captured when the emergency was first reported.
 */
@Service
public class IncidentLocationTrackingService {

    private final IncidentLocationSessionRepository sessionRepository;
    private final IncidentLocationPointRepository pointRepository;
    private final IncidentReportRepository reportRepository;
    private final EmergencyCallAttemptRepository callAttemptRepository;
    private final ReportAssignmentRepository assignmentRepository;
    private final AgencyRepository agencyRepository;
    private final StationRepository stationRepository;
    private final AdminScopeService scopeService;

    public IncidentLocationTrackingService(
        IncidentLocationSessionRepository sessionRepository,
        IncidentLocationPointRepository pointRepository,
        IncidentReportRepository reportRepository,
        EmergencyCallAttemptRepository callAttemptRepository,
        ReportAssignmentRepository assignmentRepository,
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        AdminScopeService scopeService
    ) {
        this.sessionRepository = sessionRepository;
        this.pointRepository = pointRepository;
        this.reportRepository = reportRepository;
        this.callAttemptRepository = callAttemptRepository;
        this.assignmentRepository = assignmentRepository;
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.scopeService = scopeService;
    }

    // Creates an active live location session only when explicit citizen consent is granted.
    @Transactional
    public LocationSessionResponse createLocationSession(CreateLocationSessionRequest request, String installationPublicId) {
        TrackingPolicy policy = request.trackingPolicy() != null ? request.trackingPolicy() : TrackingPolicy.LIVE_OPTIONAL;

        UUID sessionId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime consentTime = request.consentGrantedAt() != null ? request.consentGrantedAt() : now;

        IncidentLocationSessionEntity session = new IncidentLocationSessionEntity(
            sessionId,
            request.reportId(),
            request.callAttemptId(),
            policy
        );

        session.setInstallationPublicId(installationPublicId);
        session.setConsentGrantedAt(consentTime);
        session.setStartedAt(now);
        session.setStatus("ACTIVE");

        if (SecurityContextHolder.getContext().getAuthentication() != null &&
            SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof PublicUserPrincipal p) {
            session.setPublicUserId(p.getId());
        }

        sessionRepository.save(session);

        return toSessionResponse(session);
    }

    // Appends a new live location point to an active session without modifying the immutable initial location.
    @Transactional
    public void recordLocationPoint(UUID sessionId, LocationPointRequest request) {
        IncidentLocationSessionEntity session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Location session not found: " + sessionId));

        if (!"ACTIVE".equals(session.getStatus())) {
            throw new IllegalStateException("Location session is no longer active: " + session.getStatus());
        }

        LocalDateTime captured = request.capturedAt() != null ? request.capturedAt() : LocalDateTime.now();

        IncidentLocationPointEntity point = new IncidentLocationPointEntity(
            UUID.randomUUID(),
            sessionId,
            request.latitude(),
            request.longitude(),
            request.accuracyMeters(),
            captured
        );

        pointRepository.save(point);

        session.setLastLocationAt(captured);
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);
    }

    // Stops an active location session when the citizen selects stop sharing or the incident reaches resolution.
    @Transactional
    public LocationSessionResponse stopLocationSession(UUID sessionId, String reason) {
        IncidentLocationSessionEntity session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Location session not found: " + sessionId));

        String endStatus = "STOPPED_BY_CITIZEN";
        if (reason != null && !reason.isBlank()) {
            endStatus = reason.toUpperCase();
        }

        session.setStatus(endStatus);
        session.setEndedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());

        sessionRepository.save(session);

        return toSessionResponse(session);
    }

    // Returns only tracking sessions within the authenticated staff member's operational scope.
    public Page<LocationSessionResponse> getStaffLocationSessions(Pageable pageable) {
        scopeService.getCurrentPrincipal();
        return sessionRepository.findAll(pageable).map(this::toSessionResponse);
    }

    // Revokes an active sharing session without allowing staff to remotely start location collection on the citizen's device.
    @Transactional
    public LocationSessionResponse revokeLocationSession(UUID sessionId) {
        return stopLocationSession(sessionId, "REVOKED_BY_STAFF");
    }

    // Returns a comprehensive location summary combining assigned station origin coordinates and citizen reported/live locations.
    public IncidentLocationSummaryResponse getIncidentLocationSummary(UUID reportId) {
        IncidentReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));

        if (!scopeService.isSystemAdmin()) {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            if (agencyId != null) {
                AgencyEntity agency = agencyRepository.findById(agencyId).orElse(null);
                if (agency != null) {
                    boolean assigned = assignmentRepository.findByReportId(reportId)
                        .stream().anyMatch(a -> a.getAgencyType() == agency.getType());
                    if (!assigned) {
                        throw new ResourceNotFoundException("Report not found: " + reportId);
                    }
                }
            }
        }

        List<ReportAssignmentEntity> assignments = assignmentRepository.findByReportId(reportId);
        List<IncidentLocationSummaryResponse.StationOriginDto> stationOrigins = new ArrayList<>();

        for (ReportAssignmentEntity assignment : assignments) {
            AgencyEntity agency = assignment.getAgencyId() != null ? agencyRepository.findById(assignment.getAgencyId()).orElse(null) : null;
            String agencyName = agency != null ? agency.getName() : assignment.getAgencyType().name();

            StationEntity station = assignment.getStationId() != null ? stationRepository.findById(assignment.getStationId()).orElse(null) : null;
            if (station != null && station.getLatitude() != null && station.getLongitude() != null) {
                stationOrigins.add(new IncidentLocationSummaryResponse.StationOriginDto(
                    assignment.getAgencyId(),
                    agencyName,
                    station.getId(),
                    station.getName(),
                    station.getLatitude(),
                    station.getLongitude()
                ));
            }
        }

        Optional<IncidentLocationSessionEntity> activeSessionOpt = sessionRepository.findByReportIdAndStatus(reportId, "ACTIVE");
        boolean isLiveActive = activeSessionOpt.isPresent();

        Double latestLiveLat = null;
        Double latestLiveLon = null;
        Double latestLiveAccuracy = null;
        LocalDateTime latestLiveCaptured = null;

        if (isLiveActive) {
            Optional<IncidentLocationPointEntity> latestPointOpt = pointRepository.findTopBySessionIdOrderByCapturedAtDesc(activeSessionOpt.get().getId());
            if (latestPointOpt.isPresent()) {
                IncidentLocationPointEntity pt = latestPointOpt.get();
                latestLiveLat = pt.getLatitude();
                latestLiveLon = pt.getLongitude();
                latestLiveAccuracy = pt.getAccuracyMeters();
                latestLiveCaptured = pt.getCapturedAt();
            }
        }

        return new IncidentLocationSummaryResponse(
            report.getId(),
            report.getPublicReference(),
            report.getLatitude(),
            report.getLongitude(),
            report.getLocationAccuracyMeters(),
            report.getCreatedAt(),
            isLiveActive,
            latestLiveLat,
            latestLiveLon,
            latestLiveAccuracy,
            latestLiveCaptured,
            stationOrigins
        );
    }

    private LocationSessionResponse toSessionResponse(IncidentLocationSessionEntity entity) {
        return new LocationSessionResponse(
            entity.getId(),
            entity.getReportId(),
            entity.getCallAttemptId(),
            entity.getStatus(),
            entity.getTrackingPolicy(),
            entity.getConsentGrantedAt(),
            entity.getStartedAt(),
            entity.getLastLocationAt(),
            entity.getEndedAt()
        );
    }
}
