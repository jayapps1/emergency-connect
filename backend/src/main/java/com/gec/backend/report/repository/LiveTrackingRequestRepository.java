package com.gec.backend.report.repository;

import com.gec.backend.report.entity.LiveTrackingRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LiveTrackingRequestRepository extends JpaRepository<LiveTrackingRequestEntity, UUID> {
    List<LiveTrackingRequestEntity> findByReportIdOrderByRequestedAtDesc(UUID reportId);
    Optional<LiveTrackingRequestEntity> findTopByReportIdAndStatusOrderByRequestedAtDesc(UUID reportId, String status);
}
