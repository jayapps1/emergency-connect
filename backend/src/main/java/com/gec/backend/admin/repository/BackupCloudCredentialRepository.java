package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.BackupCloudCredentialEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface BackupCloudCredentialRepository extends JpaRepository<BackupCloudCredentialEntity, UUID> {
    Optional<BackupCloudCredentialEntity> findTopByProviderAndStatusOrderByConnectedAtDesc(String provider, String status);
    Optional<BackupCloudCredentialEntity> findTopByProviderOrderByConnectedAtDesc(String provider);
}
