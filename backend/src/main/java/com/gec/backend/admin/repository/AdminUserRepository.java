package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.AdminUserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AdminUserRepository extends JpaRepository<AdminUserEntity, UUID> {
    Optional<AdminUserEntity> findByEmailIgnoreCase(String email);
    List<AdminUserEntity> findByAgencyId(UUID agencyId);
    Page<AdminUserEntity> findByAgencyId(UUID agencyId, Pageable pageable);
    List<AdminUserEntity> findByStationId(UUID stationId);
    boolean existsByEmailIgnoreCase(String email);
    List<AdminUserEntity> findByMustChangePasswordTrue();
    List<AdminUserEntity> findByAgencyIdAndMustChangePasswordTrue(UUID agencyId);
}
