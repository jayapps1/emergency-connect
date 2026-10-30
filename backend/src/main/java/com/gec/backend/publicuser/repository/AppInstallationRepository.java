package com.gec.backend.publicuser.repository;

import com.gec.backend.publicuser.entity.AppInstallationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AppInstallationRepository extends JpaRepository<AppInstallationEntity, UUID> {
    Optional<AppInstallationEntity> findByInstallationPublicId(String installationPublicId);
    long countByPublicUserIdIsNull();
    Page<AppInstallationEntity> findByPublicUserIdIsNull(Pageable pageable);
    Optional<AppInstallationEntity> findByPublicUserId(UUID publicUserId);
}
