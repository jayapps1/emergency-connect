package com.gec.backend.station.repository;

import com.gec.backend.station.entity.StationContactEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StationContactRepository extends JpaRepository<StationContactEntity, UUID> {
    List<StationContactEntity> findByStationIdAndPublicContactTrueAndActiveTrueAndVerifiedTrueOrderByPriorityAsc(UUID stationId);
    List<StationContactEntity> findByStationIdOrderByPriorityAsc(UUID stationId);

    boolean existsByStationIdAndPriority(UUID stationId, int priority);
    boolean existsByStationIdAndPriorityAndIdNot(UUID stationId, int priority, UUID id);

    boolean existsByNormalizedPhoneNumber(String normalizedPhoneNumber);
    boolean existsByNormalizedPhoneNumberAndIdNot(String normalizedPhoneNumber, UUID id);
}
