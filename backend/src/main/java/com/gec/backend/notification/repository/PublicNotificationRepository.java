package com.gec.backend.notification.repository;

import com.gec.backend.notification.entity.PublicNotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PublicNotificationRepository extends JpaRepository<PublicNotificationEntity, UUID> {
    Page<PublicNotificationEntity> findByPublicUserIdOrderByCreatedAtDesc(UUID publicUserId, Pageable pageable);
    List<PublicNotificationEntity> findByPublicUserIdAndReadFalse(UUID publicUserId);
    long countByPublicUserIdAndReadFalse(UUID publicUserId);
}
