package com.gec.backend.report.repository;

import com.gec.backend.report.entity.ReportAttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ReportAttachmentRepository extends JpaRepository<ReportAttachmentEntity, UUID> {
    List<ReportAttachmentEntity> findByReportIdOrderByCreatedAtAsc(UUID reportId);
    long countByReportId(UUID reportId);
}
