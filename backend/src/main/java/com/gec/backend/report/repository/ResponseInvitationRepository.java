package com.gec.backend.report.repository;

import com.gec.backend.report.entity.ResponseInvitationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResponseInvitationRepository extends JpaRepository<ResponseInvitationEntity, UUID> {
    Optional<ResponseInvitationEntity> findByTokenHash(String tokenHash);
    List<ResponseInvitationEntity> findByReportAssignmentIdOrderByCreatedAtDesc(UUID reportAssignmentId);
}
