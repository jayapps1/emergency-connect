package com.gec.backend.report.repository;

import com.gec.backend.report.entity.IncidentTrackingShareEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentTrackingShareRepository extends JpaRepository<IncidentTrackingShareEntity, UUID> {
    Optional<IncidentTrackingShareEntity> findByTokenHash(String tokenHash);
    List<IncidentTrackingShareEntity> findByReportIdOrderByCreatedAtDesc(UUID reportId);
}
