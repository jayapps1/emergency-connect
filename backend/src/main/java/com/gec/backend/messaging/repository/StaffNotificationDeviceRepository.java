package com.gec.backend.messaging.repository;

import com.gec.backend.messaging.entity.StaffNotificationDeviceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffNotificationDeviceRepository extends JpaRepository<StaffNotificationDeviceEntity, UUID> {
    Optional<StaffNotificationDeviceEntity> findByStaffUserIdAndInstallationId(UUID staffUserId, String installationId);
    List<StaffNotificationDeviceEntity> findByStaffUserIdAndEnabledTrueAndRevokedAtIsNull(UUID staffUserId);
    List<StaffNotificationDeviceEntity> findByStaffUserIdInAndEnabledTrueAndRevokedAtIsNull(List<UUID> staffUserIds);
}
