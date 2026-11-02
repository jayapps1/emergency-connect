package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.StaffEmailHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StaffEmailHistoryRepository extends JpaRepository<StaffEmailHistoryEntity, UUID> {
    List<StaffEmailHistoryEntity> findByStaffUserIdOrderByChangedAtDesc(UUID staffUserId);
    List<StaffEmailHistoryEntity> findAllByOrderByChangedAtDesc();
}
