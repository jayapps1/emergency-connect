package com.gec.backend.report.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.report.dto.*;
import com.gec.backend.report.entity.*;
import com.gec.backend.report.repository.*;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Issues a time-limited read-only tracking token without exposing internal
 * incident-management authorization.
 */
@Service
public class IncidentTrackingShareService {

    private final IncidentTrackingShareRepository shareRepository;
    private final IncidentReportRepository reportRepository;
    private final IncidentLocationSessionRepository sessionRepository;
    private final IncidentLocationPointRepository pointRepository;
    private final ReportAssignmentRepository assignmentRepository;
    private final AgencyRepository agencyRepository;
    private final StationRepository stationRepository;
    private final IncidentCategoryRepository categoryRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public IncidentTrackingShareService(
        IncidentTrackingShareRepository shareRepository,
        IncidentReportRepository reportRepository,
        IncidentLocationSessionRepository sessionRepository,
        IncidentLocationPointRepository pointRepository,
        ReportAssignmentRepository assignmentRepository,
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        IncidentCategoryRepository categoryRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.shareRepository = shareRepository;
        this.reportRepository = reportRepository;
        this.sessionRepository = sessionRepository;
        this.pointRepository = pointRepository;
        this.assignmentRepository = assignmentRepository;
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.categoryRepository = categoryRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    // Creates a time-limited secure share token allowing authorized external view of an incident's map.
    @Transactional
    public TrackingShareResponseDto createTrackingShare(CreateTrackingShareRequestDto request) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        if (principal == null) {
            throw new AccessDeniedException("Staff authentication required.");
        }

        IncidentReportEntity report = reportRepository.findById(request.reportId())
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + request.reportId()));

        String rawToken = generateRawToken();
        String tokenHash = hashToken(rawToken);

        int durationMins = request.durationMinutes() != null && request.durationMinutes() > 0 ? request.durationMinutes() : 60;
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(durationMins);

        UUID shareId = UUID.randomUUID();
        String mode = request.shareMode() != null ? request.shareMode().toUpperCase() : "LIVE";

        IncidentTrackingShareEntity share = new IncidentTrackingShareEntity(
            shareId,
            report.getId(),
            tokenHash,
            mode,
            principal.getId(),
            expiresAt
        );

        Optional<IncidentLocationSessionEntity> activeSessionOpt = sessionRepository.findByReportIdAndStatus(report.getId(), "ACTIVE");
        activeSessionOpt.ifPresent(session -> share.setLocationSessionId(session.getId()));

        shareRepository.save(share);

        auditService.logAction(principal.getId(), "TRACKING_SHARE_CREATED", "INCIDENT_REPORT", report.getId(), principal.getAgencyId(),
            "Created tracking share link for report " + report.getPublicReference() + " in mode " + mode, null, null);

        String shareUrl = "/track/" + rawToken;

        return new TrackingShareResponseDto(
            share.getId(),
            share.getReportId(),
            rawToken,
            shareUrl,
            share.getShareMode(),
            share.getStatus(),
            share.getCreatedAt(),
            share.getExpiresAt(),
            share.getRevokedAt()
        );
    }

    // Keeps the shared tracking view synchronized with the same response session used by the control room so both users see one authoritative location.
    public PublicTrackingShareDetailResponseDto getPublicShareByToken(String rawToken) {
        String tokenHash = hashToken(rawToken);
        IncidentTrackingShareEntity share = shareRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new ResourceNotFoundException("Tracking share token not found or expired."));

        if (!"ACTIVE".equals(share.getStatus()) || (share.getExpiresAt() != null && share.getExpiresAt().isBefore(LocalDateTime.now()))) {
            throw new ResourceNotFoundException("Tracking share token has expired or been revoked.");
        }

        IncidentReportEntity report = reportRepository.findById(share.getReportId())
            .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + share.getReportId()));

        IncidentCategoryEntity category = categoryRepository.findById(report.getCategoryId()).orElse(null);
        String catName = category != null ? category.getName() : "Emergency Incident";

        List<ReportAssignmentEntity> assignments = assignmentRepository.findByReportId(report.getId());
        ReportAssignmentEntity primaryAssignment = assignments.stream().findFirst().orElse(null);

        String agencyName = null;
        String stationName = null;
        Double stationLat = null;
        Double stationLon = null;

        if (primaryAssignment != null) {
            AgencyEntity agency = primaryAssignment.getAgencyId() != null ? agencyRepository.findById(primaryAssignment.getAgencyId()).orElse(null) : null;
            agencyName = agency != null ? agency.getName() : primaryAssignment.getAgencyType().name();

            StationEntity station = primaryAssignment.getStationId() != null ? stationRepository.findById(primaryAssignment.getStationId()).orElse(null) : null;
            if (station != null) {
                stationName = station.getName();
                stationLat = station.getLatitude();
                stationLon = station.getLongitude();
            }
        }

        String trackingStatus = "WAITING";
        Double responseLat = null;
        Double responseLon = null;
        Double responseAccuracy = null;
        LocalDateTime responseLastUpdated = null;

        if (primaryAssignment != null) {
            Optional<IncidentLocationSessionEntity> activeSessionOpt = sessionRepository.findByReportIdAndStatus(report.getId(), "ACTIVE");
            if (activeSessionOpt.isPresent()) {
                trackingStatus = "LIVE";
                Optional<IncidentLocationPointEntity> latestPointOpt = pointRepository.findTopBySessionIdOrderByCapturedAtDesc(activeSessionOpt.get().getId());
                if (latestPointOpt.isPresent()) {
                    IncidentLocationPointEntity pt = latestPointOpt.get();
                    responseLat = pt.getLatitude();
                    responseLon = pt.getLongitude();
                    responseAccuracy = pt.getAccuracyMeters();
                    responseLastUpdated = pt.getCapturedAt();

                    if (responseLastUpdated != null && responseLastUpdated.isBefore(LocalDateTime.now().minusMinutes(3))) {
                        trackingStatus = "STALE";
                    }
                }
            }
        }

        return new PublicTrackingShareDetailResponseDto(
            report.getPublicReference(),
            catName,
            report.getStatus().name(),
            share.getShareMode(),
            trackingStatus,
            agencyName,
            stationName,
            "Tender-01",
            "Response Team Lead",
            stationLat,
            stationLon,
            report.getLatitude(),
            report.getLongitude(),
            responseLat,
            responseLon,
            responseAccuracy,
            responseLastUpdated
        );
    }

    @Transactional
    public TrackingShareResponseDto revokeTrackingShare(UUID shareId) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        if (principal == null) {
            throw new AccessDeniedException("Staff authentication required.");
        }

        IncidentTrackingShareEntity share = shareRepository.findById(shareId)
            .orElseThrow(() -> new ResourceNotFoundException("Tracking share not found: " + shareId));

        share.setStatus("REVOKED");
        share.setRevokedAt(LocalDateTime.now());
        shareRepository.save(share);

        return new TrackingShareResponseDto(
            share.getId(),
            share.getReportId(),
            null,
            "/track/revoked",
            share.getShareMode(),
            share.getStatus(),
            share.getCreatedAt(),
            share.getExpiresAt(),
            share.getRevokedAt()
        );
    }

    public List<TrackingShareResponseDto> getSharesForReport(UUID reportId) {
        return shareRepository.findByReportIdOrderByCreatedAtDesc(reportId).stream()
            .map(share -> new TrackingShareResponseDto(
                share.getId(),
                share.getReportId(),
                null,
                "/track/active",
                share.getShareMode(),
                share.getStatus(),
                share.getCreatedAt(),
                share.getExpiresAt(),
                share.getRevokedAt()
            ))
            .toList();
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return rawToken;
        }
    }
}
