package com.gec.backend.appliance.repository;

import com.gec.backend.appliance.entity.ResponseApplianceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResponseApplianceRepository extends JpaRepository<ResponseApplianceEntity, UUID> {
    Optional<ResponseApplianceEntity> findByCallSign(String callSign);
    List<ResponseApplianceEntity> findByAgencyId(UUID agencyId);
    List<ResponseApplianceEntity> findByHomeStationId(UUID homeStationId);
    List<ResponseApplianceEntity> findByCurrentStationId(UUID currentStationId);
    List<ResponseApplianceEntity> findByHomeStationIdOrCurrentStationId(UUID homeStationId, UUID currentStationId);
    boolean existsByCallSign(String callSign);
}
