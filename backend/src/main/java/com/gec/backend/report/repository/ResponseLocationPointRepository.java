package com.gec.backend.report.repository;

import com.gec.backend.report.entity.ResponseLocationPointEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ResponseLocationPointRepository extends JpaRepository<ResponseLocationPointEntity, UUID> {
    Optional<ResponseLocationPointEntity> findTopBySessionIdOrderByCapturedAtDesc(UUID sessionId);
}
