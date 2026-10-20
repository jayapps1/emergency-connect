package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.AdminReportDetailsResponse;
import com.gec.backend.admin.dto.AdminReportSummaryResponse;
import com.gec.backend.admin.dto.AdminUserResponse;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.entity.RoleEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.messaging.entity.StaffNotificationDeviceEntity;
import com.gec.backend.messaging.entity.StaffNotificationEntity;
import com.gec.backend.messaging.repository.StaffNotificationDeviceRepository;
import com.gec.backend.messaging.repository.StaffNotificationRepository;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for staff mobile APIs supporting operational field responders, station staff, and agency administrators.
 *
 * <p>Read-Only Enforcement:
 * Field RESPONDER roles can retrieve assigned incidents, details, maps, and station contacts,
 * but are strictly prohibited from mutating operational report workflow status (returns HTTP 403 Forbidden).
 */
@Service
public class StaffMobileService {

    private final AdminUserRepository userRepository;
    private final AgencyRepository agencyRepository;
    private final StationRepository stationRepository;
    private final AdminReportWorkflowService reportWorkflowService;
    private final StaffNotificationDeviceRepository deviceRepository;
    private final StaffNotificationRepository notificationRepository;
    private final AdminScopeService scopeService;

    public StaffMobileService(
        AdminUserRepository userRepository,
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        AdminReportWorkflowService reportWorkflowService,
        StaffNotificationDeviceRepository deviceRepository,
        StaffNotificationRepository notificationRepository,
        AdminScopeService scopeService
    ) {
        this.userRepository = userRepository;
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.reportWorkflowService = reportWorkflowService;
        this.deviceRepository = deviceRepository;
        this.notificationRepository = notificationRepository;
        this.scopeService = scopeService;
    }

    public AdminUserResponse getStaffProfile() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminUserEntity user = userRepository.findById(principal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Staff user not found: " + principal.getId()));

        Set<String> roleCodes = user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet());
        String agencyName = user.getAgencyId() != null ? agencyRepository.findById(user.getAgencyId()).map(AgencyEntity::getName).orElse(null) : null;
        String stationName = user.getStationId() != null ? stationRepository.findById(user.getStationId()).map(StationEntity::getName).orElse(null) : null;

        return new AdminUserResponse(
            user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getPhoneNumber(),
            user.getAgencyId(), agencyName, user.getRegion(), user.getStationId(), stationName,
            user.isActive(), user.isLocked(), user.isMustChangePassword(), user.getLastLoginAt(), roleCodes
        );
    }

    public Page<AdminReportSummaryResponse> getStaffIncidents(Pageable pageable) {
        // Derives incidents scoped to the authenticated staff user's agency and station
        return reportWorkflowService.getReports(pageable);
    }

    public AdminReportDetailsResponse getStaffIncidentDetail(UUID reportId) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        AdminReportDetailsResponse details = reportWorkflowService.getReportDetails(reportId);

        // Enforce station scope for field responders
        if (principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_RESPONDER"))) {
            if (principal.getStationId() != null) {
                boolean stationAssigned = details.agencyAssignments().stream()
                    .anyMatch(a -> principal.getStationId().equals(a.stationId()));
                if (!stationAssigned && !scopeService.isSystemAdmin()) {
                    throw new ResourceNotFoundException("Report not found or not assigned to your station: " + reportId);
                }
            }
        }

        return details;
    }

    @Transactional
    public void registerStaffDevice(Map<String, String> body) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        String installationId = body.get("installationId");
        String pushToken = body.get("pushToken");
        String platform = body.getOrDefault("platform", "ANDROID");
        String deviceLabel = body.get("deviceLabel");
        String appVersion = body.get("appVersion");

        if (installationId == null || installationId.isBlank() || pushToken == null || pushToken.isBlank()) {
            throw new IllegalArgumentException("Installation ID and Push Token are required.");
        }

        Optional<StaffNotificationDeviceEntity> deviceOpt = deviceRepository
            .findByStaffUserIdAndInstallationId(principal.getId(), installationId.trim());

        StaffNotificationDeviceEntity device;
        if (deviceOpt.isPresent()) {
            device = deviceOpt.get();
            device.setPushToken(pushToken.trim());
            device.setPlatform(platform);
            device.setDeviceLabel(deviceLabel);
            device.setAppVersion(appVersion);
            device.setEnabled(true);
            device.setRevokedAt(null);
            device.setLastSeenAt(LocalDateTime.now());
        } else {
            device = new StaffNotificationDeviceEntity(
                UUID.randomUUID(),
                principal.getId(),
                installationId.trim(),
                platform,
                pushToken.trim(),
                deviceLabel,
                appVersion
            );
        }

        deviceRepository.save(device);
    }

    @Transactional
    public void revokeStaffDevice(String installationId) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        Optional<StaffNotificationDeviceEntity> deviceOpt = deviceRepository
            .findByStaffUserIdAndInstallationId(principal.getId(), installationId.trim());

        if (deviceOpt.isPresent()) {
            StaffNotificationDeviceEntity device = deviceOpt.get();
            device.setEnabled(false);
            device.setRevokedAt(LocalDateTime.now());
            deviceRepository.save(device);
        }
    }

    public Page<StaffNotificationEntity> getStaffNotifications(Pageable pageable) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        return notificationRepository.findByStaffUserIdOrderByCreatedAtDesc(principal.getId(), pageable);
    }

    public Map<String, Object> getUnreadNotificationCount() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        long count = notificationRepository.countByStaffUserIdAndReadAtIsNull(principal.getId());
        return Map.of("unreadCount", count);
    }

    @Transactional
    public void markNotificationAsRead(UUID notificationId) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        StaffNotificationEntity notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        if (!notification.getStaffUserId().equals(principal.getId())) {
            throw new ResourceNotFoundException("Notification not found: " + notificationId);
        }

        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllNotificationsAsRead() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        List<StaffNotificationEntity> unreadList = notificationRepository.findByStaffUserIdAndReadAtIsNull(principal.getId());
        for (StaffNotificationEntity notif : unreadList) {
            notif.setReadAt(LocalDateTime.now());
        }
        notificationRepository.saveAll(unreadList);
    }
}
