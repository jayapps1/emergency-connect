package com.gec.backend.report.repository;

import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.report.entity.ReportAssignmentEntity;
import com.gec.backend.report.entity.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ReportAssignmentRepository extends JpaRepository<ReportAssignmentEntity, UUID> {
    List<ReportAssignmentEntity> findByReportId(UUID reportId);
    List<ReportAssignmentEntity> findByAgencyType(AgencyType agencyType);
    List<ReportAssignmentEntity> findByAgencyId(UUID agencyId);
    List<ReportAssignmentEntity> findByStatusIn(List<ReportStatus> statuses);
}
