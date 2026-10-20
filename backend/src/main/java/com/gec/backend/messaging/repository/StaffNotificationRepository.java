package com.gec.backend.messaging.repository;

import com.gec.backend.messaging.entity.StaffNotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StaffNotificationRepository extends JpaRepository<StaffNotificationEntity, UUID> {
    Page<StaffNotificationEntity> findByStaffUserIdOrderByCreatedAtDesc(UUID staffUserId, Pageable pageable);
    List<StaffNotificationEntity> findByStaffUserIdAndReadAtIsNull(UUID staffUserId);
    long countByStaffUserIdAndReadAtIsNull(UUID staffUserId);
}
