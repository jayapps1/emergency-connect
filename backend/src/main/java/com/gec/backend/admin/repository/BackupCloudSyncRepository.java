package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.BackupCloudSyncEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BackupCloudSyncRepository extends JpaRepository<BackupCloudSyncEntity, UUID> {
    Optional<BackupCloudSyncEntity> findByBackupId(UUID backupId);
    List<BackupCloudSyncEntity> findByStatusIn(List<String> statuses);
    long countByStatus(String status);
}
