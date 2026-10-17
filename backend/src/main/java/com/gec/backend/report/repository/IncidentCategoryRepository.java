package com.gec.backend.report.repository;

import com.gec.backend.report.entity.IncidentCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IncidentCategoryRepository extends JpaRepository<IncidentCategoryEntity, UUID> {
    List<IncidentCategoryEntity> findByActiveTrue();
    List<IncidentCategoryEntity> findAllByOrderByDisplayOrderAscNameAsc();
    List<IncidentCategoryEntity> findByActiveTrueOrderByDisplayOrderAscNameAsc();
    List<IncidentCategoryEntity> findByActiveTrueAndSupportsSilentTrueOrderByDisplayOrderAscNameAsc();
    List<IncidentCategoryEntity> findByActiveTrueAndSupportsGeneralTrueOrderByDisplayOrderAscNameAsc();
    Optional<IncidentCategoryEntity> findByIdAndActiveTrue(UUID id);
    boolean existsByCodeIgnoreCase(String code);
}
