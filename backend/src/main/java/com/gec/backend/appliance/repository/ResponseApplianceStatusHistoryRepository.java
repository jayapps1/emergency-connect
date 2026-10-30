package com.gec.backend.appliance.repository;

import com.gec.backend.appliance.entity.ResponseApplianceStatusHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ResponseApplianceStatusHistoryRepository extends JpaRepository<ResponseApplianceStatusHistoryEntity, UUID> {
    List<ResponseApplianceStatusHistoryEntity> findByApplianceIdOrderByChangedAtDesc(UUID applianceId);
}
