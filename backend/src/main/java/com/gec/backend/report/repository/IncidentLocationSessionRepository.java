package com.gec.backend.report.repository;

import com.gec.backend.report.entity.IncidentLocationSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentLocationSessionRepository extends JpaRepository<IncidentLocationSessionEntity, UUID> {
    Optional<IncidentLocationSessionEntity> findByReportIdAndStatus(UUID reportId, String status);
    Optional<IncidentLocationSessionEntity> findByCallAttemptIdAndStatus(UUID callAttemptId, String status);
    List<IncidentLocationSessionEntity> findByReportId(UUID reportId);
}
