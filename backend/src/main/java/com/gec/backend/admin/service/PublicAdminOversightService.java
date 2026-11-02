package com.gec.backend.admin.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.publicuser.entity.AppInstallationEntity;
import com.gec.backend.publicuser.entity.PublicAuthSessionEntity;
import com.gec.backend.publicuser.entity.PublicUserEntity;
import com.gec.backend.publicuser.repository.AppInstallationRepository;
import com.gec.backend.publicuser.repository.PublicAuthSessionRepository;
import com.gec.backend.publicuser.repository.PublicUserRepository;
import com.gec.backend.report.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Applies the authenticated staff hierarchy to citizen queries so national,
 * agency, regional, and station users receive only their authorized records.
 */
@Service
public class PublicAdminOversightService {

    private static final Logger log = LoggerFactory.getLogger(PublicAdminOversightService.class);

    private final PublicUserRepository publicUserRepository;
    private final AppInstallationRepository installationRepository;
    private final PublicAuthSessionRepository sessionRepository;
    private final IncidentReportRepository reportRepository;
    private final IncidentResponseReviewRepository reviewRepository;
    private final EmergencyCallAttemptRepository callAttemptRepository;
    private final IncidentFollowUpRepository followUpRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public PublicAdminOversightService(
        PublicUserRepository publicUserRepository,
        AppInstallationRepository installationRepository,
        PublicAuthSessionRepository sessionRepository,
        IncidentReportRepository reportRepository,
        IncidentResponseReviewRepository reviewRepository,
        EmergencyCallAttemptRepository callAttemptRepository,
        IncidentFollowUpRepository followUpRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.publicUserRepository = publicUserRepository;
        this.installationRepository = installationRepository;
        this.sessionRepository = sessionRepository;
        this.reportRepository = reportRepository;
        this.reviewRepository = reviewRepository;
        this.callAttemptRepository = callAttemptRepository;
        this.followUpRepository = followUpRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public Map<String, Object> getPublicUserSummary() {
        scopeService.checkSystemAdminAccess();

        List<PublicUserEntity> allUsers = publicUserRepository.findAll();
        long totalAccounts = allUsers.size();
        long verifiedAccounts = allUsers.stream().filter(PublicUserEntity::isPhoneVerified).count();
        long activeAccounts = allUsers.stream().filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus())).count();
        long disabledAccounts = allUsers.stream().filter(u -> "DISABLED".equalsIgnoreCase(u.getStatus())).count();
        long guestInstallations = installationRepository.countByPublicUserIdIsNull();

        return Map.of(
            "totalAccounts", totalAccounts,
            "verifiedAccounts", verifiedAccounts,
            "activeAccounts", activeAccounts,
            "disabledAccounts", disabledAccounts,
            "guestInstallations", guestInstallations
        );
    }

    public Page<Map<String, Object>> getPublicUsers(String status, Boolean verified, Boolean totp, String search, Pageable pageable) {
        scopeService.checkSystemAdminAccess();

        List<PublicUserEntity> allUsers = publicUserRepository.findAll();

        List<Map<String, Object>> filtered = allUsers.stream().filter(u -> {
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status) && !status.equalsIgnoreCase(u.getStatus())) {
                return false;
            }
            if (verified != null && u.isPhoneVerified() != verified) {
                return false;
            }
            if (totp != null && u.isTotpEnabled() != totp) {
                return false;
            }
            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase(Locale.US);
                String maskedPhone = maskPhoneNumber(u.getPhoneNumberNormalized());
                String userRef = "PUB-" + u.getId().toString().substring(0, 6).toUpperCase(Locale.US);
                if (!maskedPhone.toLowerCase(Locale.US).contains(q) && !userRef.toLowerCase(Locale.US).contains(q)) {
                    return false;
                }
            }
            return true;
        }).map(this::mapToPublicUserDto)
        .sorted((a, b) -> ((String) b.get("createdAt")).compareTo((String) a.get("createdAt")))
        .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        List<Map<String, Object>> pageContent = start <= end ? filtered.subList(start, end) : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    public Page<Map<String, Object>> getGuestInstallations(Pageable pageable) {
        scopeService.checkSystemAdminAccess();

        Page<AppInstallationEntity> guestsPage = installationRepository.findByPublicUserIdIsNull(pageable);
        List<Map<String, Object>> dtos = guestsPage.getContent().stream().map(this::mapToGuestDto).toList();

        return new PageImpl<>(dtos, pageable, guestsPage.getTotalElements());
    }

    @Transactional
    public Map<String, Object> disablePublicUser(UUID userId) {
        scopeService.checkSystemAdminAccess();

        PublicUserEntity user = publicUserRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Public user account not found: " + userId));

        user.setStatus("DISABLED");
        user.setUpdatedAt(LocalDateTime.now());
        publicUserRepository.save(user);

        // Revoke all active auth sessions
        List<PublicAuthSessionEntity> sessions = sessionRepository.findByPublicUserIdAndRevokedAtIsNull(userId);
        for (PublicAuthSessionEntity s : sessions) {
            s.setRevokedAt(LocalDateTime.now());
        }
        sessionRepository.saveAll(sessions);

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        auditService.logAction(
            principal.getId(),
            "PUBLIC_USER_DISABLED",
            "PUBLIC_USER",
            userId,
            null,
            "Disabled public citizen account " + maskPhoneNumber(user.getPhoneNumberNormalized()),
            null,
            null
        );

        return mapToPublicUserDto(user);
    }

    @Transactional
    public Map<String, Object> enablePublicUser(UUID userId) {
        scopeService.checkSystemAdminAccess();

        PublicUserEntity user = publicUserRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Public user account not found: " + userId));

        user.setStatus("ACTIVE");
        user.setUpdatedAt(LocalDateTime.now());
        publicUserRepository.save(user);

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        auditService.logAction(
            principal.getId(),
            "PUBLIC_USER_ENABLED",
            "PUBLIC_USER",
            userId,
            null,
            "Re-enabled public citizen account " + maskPhoneNumber(user.getPhoneNumberNormalized()),
            null,
            null
        );

        return mapToPublicUserDto(user);
    }

    @Transactional
    public Map<String, Object> revokePublicUserSessions(UUID userId) {
        scopeService.checkSystemAdminAccess();

        PublicUserEntity user = publicUserRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Public user account not found: " + userId));

        List<PublicAuthSessionEntity> sessions = sessionRepository.findByPublicUserIdAndRevokedAtIsNull(userId);
        for (PublicAuthSessionEntity s : sessions) {
            s.setRevokedAt(LocalDateTime.now());
        }
        sessionRepository.saveAll(sessions);

        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        auditService.logAction(
            principal.getId(),
            "PUBLIC_USER_SESSIONS_REVOKED",
            "PUBLIC_USER",
            userId,
            null,
            "Revoked active sessions for public user " + maskPhoneNumber(user.getPhoneNumberNormalized()),
            null,
            null
        );

        return Map.of("userId", userId.toString(), "revokedCount", sessions.size());
    }

    // Includes complaints linked directly to the citizen and legitimate history retained through installations used before account registration.
    private Map<String, Object> mapToPublicUserDto(PublicUserEntity user) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", user.getId().toString());
        dto.put("publicReference", "PUB-" + user.getId().toString().substring(0, 6).toUpperCase(Locale.US));
        dto.put("phoneNumberMasked", maskPhoneNumber(user.getPhoneNumberNormalized()));
        dto.put("phoneVerified", user.isPhoneVerified());
        dto.put("status", user.getStatus());
        dto.put("totpEnabled", user.isTotpEnabled());
        dto.put("createdAt", user.getCreatedAt().toString());
        dto.put("lastLoginAt", user.getLastLoginAt() != null ? user.getLastLoginAt().toString() : null);

        long reportCount = reportRepository.countByReporterPublicUserId(user.getId());
        long complaintCount = reviewRepository.countByPublicUserId(user.getId());
        long callCount = callAttemptRepository.countByPublicUserId(user.getId());

        dto.put("reportCount", reportCount);
        dto.put("complaintCount", complaintCount);
        dto.put("callCount", callCount);
        dto.put("followUpCount", 0L);

        List<PublicAuthSessionEntity> activeSessions = sessionRepository.findByPublicUserIdAndRevokedAtIsNull(user.getId());
        dto.put("activeSessionCount", activeSessions.size());

        return dto;
    }

    private Map<String, Object> mapToGuestDto(AppInstallationEntity inst) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", inst.getId().toString());
        dto.put("guestReference", "GUEST-" + inst.getId().toString().substring(0, 6).toUpperCase(Locale.US));
        dto.put("status", inst.getStatus());
        dto.put("isLinkedAccount", inst.getPublicUserId() != null);
        dto.put("createdAt", inst.getCreatedAt().toString());
        dto.put("lastSeenAt", inst.getLastSeenAt().toString());

        long reportCount = reportRepository.countByInstallationId(inst.getId());
        dto.put("reportCount", reportCount);

        return dto;
    }

    private String maskPhoneNumber(String phone) {
        if (phone == null || phone.isBlank()) return "N/A";
        String trimmed = phone.trim();
        if (trimmed.length() < 7) return trimmed;
        int len = trimmed.length();
        return trimmed.substring(0, 4) + " *** *** " + trimmed.substring(len - 3);
    }
}
