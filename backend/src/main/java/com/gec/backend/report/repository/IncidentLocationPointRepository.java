package com.gec.backend.report.repository;

import com.gec.backend.report.entity.IncidentLocationPointEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentLocationPointRepository extends JpaRepository<IncidentLocationPointEntity, UUID> {
    List<IncidentLocationPointEntity> findBySessionIdOrderByCapturedAtAsc(UUID sessionId);
    Optional<IncidentLocationPointEntity> findTopBySessionIdOrderByCapturedAtDesc(UUID sessionId);
}
