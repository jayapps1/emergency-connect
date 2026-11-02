package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.BackupScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BackupScheduleRepository extends JpaRepository<BackupScheduleEntity, UUID> {
    List<BackupScheduleEntity> findByEnabledTrue();
    List<BackupScheduleEntity> findAllByOrderByCreatedAtDesc();
}
