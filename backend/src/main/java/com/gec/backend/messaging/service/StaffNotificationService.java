package com.gec.backend.messaging.service;

import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.messaging.entity.StaffNotificationEntity;
import com.gec.backend.messaging.repository.StaffNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for generating, persisting, and dispatching in-app alerts to station staff and responders.
 */
@Service
public class StaffNotificationService {

    private static final Logger log = LoggerFactory.getLogger(StaffNotificationService.class);

    private final AdminUserRepository userRepository;
    private final StaffNotificationRepository notificationRepository;

    public StaffNotificationService(
        AdminUserRepository userRepository,
        StaffNotificationRepository notificationRepository
    ) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public StaffNotificationEntity sendNotification(UUID userId, String title, String body, String type, String actionUrl) {
        StaffNotificationEntity entity = new StaffNotificationEntity(
            UUID.randomUUID(), userId, null, null, type, title, body, actionUrl
        );
        return notificationRepository.save(entity);
    }

    public List<StaffNotificationEntity> getUserNotifications(UUID userId) {
        return notificationRepository.findByStaffUserIdOrderByCreatedAtDesc(userId, Pageable.ofSize(100)).getContent();
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByStaffUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getStaffUserId().equals(userId) && n.getReadAt() == null) {
                n.setReadAt(LocalDateTime.now());
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void markAllAsRead(UUID staffUserId) {
        List<StaffNotificationEntity> unreadList = notificationRepository.findByStaffUserIdAndReadAtIsNull(staffUserId);
        LocalDateTime now = LocalDateTime.now();
        for (StaffNotificationEntity n : unreadList) {
            n.setReadAt(now);
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void deleteNotification(UUID notificationId, UUID staffUserId) {
        notificationRepository.deleteByIdAndStaffUserId(notificationId, staffUserId);
    }

    @Transactional
    public void deleteAllRead(UUID staffUserId) {
        notificationRepository.deleteByStaffUserIdAndReadAtIsNotNull(staffUserId);
    }

    @Async
    @Transactional
    public void notifyStationStaff(UUID agencyId, UUID stationId, UUID reportId, UUID assignmentId, String eventType, String title, String body) {
        if (stationId == null && agencyId == null) return;

        List<AdminUserEntity> eligibleStaff;
        if (stationId != null) {
            eligibleStaff = userRepository.findByStationId(stationId);
        } else {
            eligibleStaff = userRepository.findByAgencyId(agencyId);
        }

        for (AdminUserEntity staff : eligibleStaff) {
            if (staff.isActive() && !staff.isLocked()) {
                StaffNotificationEntity notif = new StaffNotificationEntity(
                    UUID.randomUUID(),
                    staff.getId(),
                    reportId,
                    assignmentId,
                    eventType,
                    title,
                    body
                );
                notificationRepository.save(notif);
                log.info("Persisted staff notification [{}] for staff user {}", eventType, staff.getEmail());
            }
        }
    }
}
