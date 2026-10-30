package com.gec.backend.report.repository;

import com.gec.backend.report.entity.EmergencyCallAttemptEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmergencyCallAttemptRepository extends JpaRepository<EmergencyCallAttemptEntity, UUID> {
    Optional<EmergencyCallAttemptEntity> findByClientGeneratedRequestId(UUID clientGeneratedRequestId);
    Optional<EmergencyCallAttemptEntity> findByPublicReference(String publicReference);
    List<EmergencyCallAttemptEntity> findByAgencyIdOrderByInitiatedAtDesc(UUID agencyId);
    Page<EmergencyCallAttemptEntity> findByAgencyIdOrderByInitiatedAtDesc(UUID agencyId, Pageable pageable);
    List<EmergencyCallAttemptEntity> findByStationIdOrderByInitiatedAtDesc(UUID stationId);
    Page<EmergencyCallAttemptEntity> findByStationIdOrderByInitiatedAtDesc(UUID stationId, Pageable pageable);
    Page<EmergencyCallAttemptEntity> findAllByOrderByInitiatedAtDesc(Pageable pageable);
}
