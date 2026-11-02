package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.BackupJobEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BackupJobRepository extends JpaRepository<BackupJobEntity, UUID> {
    Optional<BackupJobEntity> findByReference(String reference);
    Page<BackupJobEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<BackupJobEntity> findByStatusOrderByCreatedAtDesc(String status);
    Optional<BackupJobEntity> findTopByBackupTypeAndStatusInOrderByCreatedAtDesc(String backupType, List<String> statuses);
    Optional<BackupJobEntity> findTopByStatusInOrderByCreatedAtDesc(List<String> statuses);
}
