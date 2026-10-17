package com.gec.backend.station.repository;

import com.gec.backend.reference.entity.StationLevel;
import com.gec.backend.station.entity.StationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StationRepository extends JpaRepository<StationEntity, UUID> {
    boolean existsByCode(String code);
    List<StationEntity> findByAgencyIdAndActiveTrueAndVerifiedTrue(UUID agencyId);
    Optional<StationEntity> findByIdAndActiveTrueAndVerifiedTrue(UUID id);
    List<StationEntity> findByAgencyId(UUID agencyId);
    Page<StationEntity> findByAgencyId(UUID agencyId, Pageable pageable);
    List<StationEntity> findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(String name, String code);
    List<StationEntity> findByStationLevelAndActiveTrueAndVerifiedTrue(StationLevel stationLevel);
    List<StationEntity> findByAgencyIdAndRegionIdAndStationLevelAndActiveTrueAndVerifiedTrue(UUID agencyId, UUID regionId, StationLevel stationLevel);
    List<StationEntity> findByAgencyIdAndRegionAndStationLevelAndActiveTrueAndVerifiedTrue(UUID agencyId, String region, StationLevel stationLevel);
    boolean existsByAgencyIdAndRegionAndDistrictAndStationLevelAndNameIgnoreCase(UUID agencyId, String region, String district, StationLevel stationLevel, String name);
}
