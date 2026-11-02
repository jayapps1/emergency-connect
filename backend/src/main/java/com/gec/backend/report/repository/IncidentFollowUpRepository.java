package com.gec.backend.report.repository;

import com.gec.backend.report.entity.IncidentFollowUpEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface IncidentFollowUpRepository extends JpaRepository<IncidentFollowUpEntity, UUID> {
    List<IncidentFollowUpEntity> findByReportIdOrderByCreatedAtDesc(UUID reportId);
    List<IncidentFollowUpEntity> findByReportIdAndAgencyIdOrderByCreatedAtDesc(UUID reportId, UUID agencyId);
    boolean existsByReportIdAndAgencyIdAndStatusIn(UUID reportId, UUID agencyId, List<String> statuses);
}
