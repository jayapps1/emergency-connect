package com.gec.backend.notification.service;

import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.notification.entity.PublicNotificationEntity;
import com.gec.backend.notification.entity.PushDeviceRegistrationEntity;
import com.gec.backend.notification.repository.PublicNotificationRepository;
import com.gec.backend.notification.repository.PushDeviceRegistrationRepository;
import com.gec.backend.publicuser.security.PublicUserPrincipal;
import com.gec.backend.report.entity.IncidentReportEntity;
import com.gec.backend.report.entity.ReportMode;
import com.gec.backend.report.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PublicNotificationService {

    private final PublicNotificationRepository notificationRepository;
    private final PushDeviceRegistrationRepository pushDeviceRepository;
    private final FcmPushService fcmPushService;

    public PublicNotificationService(
        PublicNotificationRepository notificationRepository,
        PushDeviceRegistrationRepository pushDeviceRepository,
        FcmPushService fcmPushService
    ) {
        this.notificationRepository = notificationRepository;
        this.pushDeviceRepository = pushDeviceRepository;
        this.fcmPushService = fcmPushService;
    }

    @Transactional
    public void notifyReportStatusChange(IncidentReportEntity report, ReportStatus newStatus) {
        if (report.getReporterPublicUserId() == null) {
            return;
        }

        UUID publicUserId = report.getReporterPublicUserId();
        String eventType = "REPORT_" + newStatus.name();

        String title;
        String message;

        if (report.getReportMode() == ReportMode.SILENT) {
            title = "Ghana Emergency Connect";
            message = "Your report status has been updated.";
        } else {
            switch (newStatus) {
                case ACKNOWLEDGED:
                    title = "Report Acknowledged";
                    message = "A responding emergency agency has acknowledged report " + report.getPublicReference() + ".";
                    break;
                case IN_PROGRESS:
                    title = "Response In Progress";
                    message = "Emergency units are actively handling report " + report.getPublicReference() + ".";
                    break;
                case RESOLVED:
                    title = "Report Resolved";
                    message = "Report " + report.getPublicReference() + " has been marked as resolved.";
                    break;
                default:
                    title = "Report Update";
                    message = "Status for report " + report.getPublicReference() + " is now " + newStatus.name() + ".";
                    break;
            }
        }

        PublicNotificationEntity notification = new PublicNotificationEntity(
            UUID.randomUUID(),
            publicUserId,
            report.getId(),
            eventType,
            title,
            message
        );
        notificationRepository.save(notification);

        List<PushDeviceRegistrationEntity> devices = pushDeviceRepository.findByPublicUserIdAndActiveTrue(publicUserId);
        for (PushDeviceRegistrationEntity device : devices) {
            fcmPushService.sendPushNotification(device.getDeviceToken(), title, message, report.getId().toString());
        }
    }

    @Transactional
    public void registerPushToken(String deviceToken, String installationId) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        UUID publicUserId = principal != null ? principal.getId() : null;

        if (deviceToken == null || deviceToken.isBlank()) {
            return;
        }

        String tokenKey = deviceToken.trim();
        PushDeviceRegistrationEntity reg = pushDeviceRepository.findByDeviceToken(tokenKey)
            .orElseGet(() -> new PushDeviceRegistrationEntity(UUID.randomUUID(), publicUserId, installationId, tokenKey));

        if (publicUserId != null) {
            reg.setPublicUserId(publicUserId);
        }
        if (installationId != null) {
            reg.setAppInstallationId(installationId);
        }
        reg.setActive(true);
        reg.setUpdatedAt(LocalDateTime.now());

        pushDeviceRepository.save(reg);
    }

    public Page<PublicNotificationEntity> getNotifications(Pageable pageable) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) {
            throw new ResourceNotFoundException("Authentication required.");
        }
        return notificationRepository.findByPublicUserIdOrderByCreatedAtDesc(principal.getId(), pageable);
    }

    public long getUnreadCount() {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return 0;
        return notificationRepository.countByPublicUserIdAndReadFalse(principal.getId());
    }

    @Transactional
    public void markAsRead(UUID notificationId) {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return;

        PublicNotificationEntity notif = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notif.getPublicUserId().equals(principal.getId())) {
            throw new ResourceNotFoundException("Notification not found");
        }

        notif.setRead(true);
        notif.setReadAt(LocalDateTime.now());
        notificationRepository.save(notif);
    }

    @Transactional
    public void markAllAsRead() {
        PublicUserPrincipal principal = getCurrentPrincipal();
        if (principal == null) return;

        List<PublicNotificationEntity> unread = notificationRepository.findByPublicUserIdAndReadFalse(principal.getId());
        for (PublicNotificationEntity notif : unread) {
            notif.setRead(true);
            notif.setReadAt(LocalDateTime.now());
        }
        notificationRepository.saveAll(unread);
    }

    private PublicUserPrincipal getCurrentPrincipal() {
        Object principal = SecurityContextHolder.getContext().getAuthentication() != null
            ? SecurityContextHolder.getContext().getAuthentication().getPrincipal()
            : null;
        if (principal instanceof PublicUserPrincipal p) {
            return p;
        }
        return null;
    }
}
