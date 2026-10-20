package com.gec.backend.notification.repository;

import com.gec.backend.notification.entity.PushDeviceRegistrationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushDeviceRegistrationRepository extends JpaRepository<PushDeviceRegistrationEntity, UUID> {
    Optional<PushDeviceRegistrationEntity> findByDeviceToken(String deviceToken);
    List<PushDeviceRegistrationEntity> findByPublicUserIdAndActiveTrue(UUID publicUserId);
}
