package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.BackupRestoreRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BackupRestoreRequestRepository extends JpaRepository<BackupRestoreRequestEntity, UUID> {
    List<BackupRestoreRequestEntity> findAllByOrderByRequestedAtDesc();
    List<BackupRestoreRequestEntity> findByStatus(String status);
}
