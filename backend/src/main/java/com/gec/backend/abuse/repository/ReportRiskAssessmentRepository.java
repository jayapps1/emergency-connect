package com.gec.backend.abuse.repository;

import com.gec.backend.abuse.entity.ReportRiskAssessmentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface ReportRiskAssessmentRepository extends JpaRepository<ReportRiskAssessmentEntity, UUID> {
    Optional<ReportRiskAssessmentEntity> findByReportId(UUID reportId);
    Page<ReportRiskAssessmentEntity> findByReviewStatus(String reviewStatus, Pageable pageable);
    Page<ReportRiskAssessmentEntity> findByRiskLevelIn(Collection<String> riskLevels, Pageable pageable);
}
