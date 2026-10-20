package com.gec.backend.messaging.service;

import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.repository.AdminUserRepository;
import com.gec.backend.messaging.entity.StaffNotificationEntity;
import com.gec.backend.messaging.repository.StaffNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
