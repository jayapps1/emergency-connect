package com.gec.backend.report.repository;

import com.gec.backend.report.entity.IncidentResponseReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentResponseReviewRepository extends JpaRepository<IncidentResponseReviewEntity, UUID> {
    Optional<IncidentResponseReviewEntity> findByAssignmentIdAndPublicUserId(UUID assignmentId, UUID publicUserId);
    Optional<IncidentResponseReviewEntity> findByAssignmentId(UUID assignmentId);
    List<IncidentResponseReviewEntity> findByReportId(UUID reportId);
    List<IncidentResponseReviewEntity> findByAgencyId(UUID agencyId);
}
