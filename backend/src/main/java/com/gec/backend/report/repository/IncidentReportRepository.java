package com.gec.backend.report.repository;

import com.gec.backend.report.entity.IncidentReportEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentReportRepository extends JpaRepository<IncidentReportEntity, UUID> {
    Optional<IncidentReportEntity> findByPublicReference(String publicReference);
    Optional<IncidentReportEntity> findByClientGeneratedRequestId(UUID clientGeneratedRequestId);
    Page<IncidentReportEntity> findByIdIn(Collection<UUID> ids, Pageable pageable);
    List<IncidentReportEntity> findByReporterPublicUserIdOrderByCreatedAtDesc(UUID reporterPublicUserId);
    List<IncidentReportEntity> findByInstallationIdOrderByCreatedAtDesc(UUID installationId);
}
