package com.gec.backend.report.repository;

import com.gec.backend.report.entity.ResponseTrackingSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResponseTrackingSessionRepository extends JpaRepository<ResponseTrackingSessionEntity, UUID> {
    Optional<ResponseTrackingSessionEntity> findByReportAssignmentIdAndStatus(UUID reportAssignmentId, String status);
    List<ResponseTrackingSessionEntity> findByReportAssignmentId(UUID reportAssignmentId);
}
