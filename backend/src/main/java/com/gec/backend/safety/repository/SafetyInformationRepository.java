package com.gec.backend.safety.repository;

import com.gec.backend.safety.entity.SafetyInformationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface SafetyInformationRepository extends JpaRepository<SafetyInformationEntity, UUID> {

    List<SafetyInformationEntity> findByAgencyId(UUID agencyId);

    @Query("SELECT s FROM SafetyInformationEntity s WHERE s.status = 'PUBLISHED' AND s.removedAt IS NULL AND (s.expiresAt IS NULL OR s.expiresAt > CURRENT_TIMESTAMP) ORDER BY CASE WHEN s.severity = 'CRITICAL' THEN 1 WHEN s.severity = 'WARNING' THEN 2 WHEN s.severity = 'ADVISORY' THEN 3 ELSE 4 END ASC, s.publishedAt DESC")
    List<SafetyInformationEntity> findActivePublicPosts();
}
