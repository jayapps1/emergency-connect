package com.gec.backend.report.repository;

import com.gec.backend.report.entity.StaffIncidentReadStateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface StaffIncidentReadStateRepository extends JpaRepository<StaffIncidentReadStateEntity, UUID> {
    boolean existsByStaffUserIdAndReportId(UUID staffUserId, UUID reportId);
    Optional<StaffIncidentReadStateEntity> findByStaffUserIdAndReportId(UUID staffUserId, UUID reportId);
    Set<StaffIncidentReadStateEntity> findByStaffUserId(UUID staffUserId);
}
