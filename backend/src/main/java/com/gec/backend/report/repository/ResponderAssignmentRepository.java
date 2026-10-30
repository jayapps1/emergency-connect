package com.gec.backend.report.repository;

import com.gec.backend.report.entity.ResponderAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResponderAssignmentRepository extends JpaRepository<ResponderAssignmentEntity, UUID> {

    List<ResponderAssignmentEntity> findByReportAssignmentIdAndActiveTrue(UUID reportAssignmentId);

    List<ResponderAssignmentEntity> findByReportAssignmentId(UUID reportAssignmentId);

    List<ResponderAssignmentEntity> findByResponderUserIdAndActiveTrue(UUID responderUserId);

    boolean existsByReportAssignmentIdAndResponderUserIdAndActiveTrue(UUID reportAssignmentId, UUID responderUserId);

    Optional<ResponderAssignmentEntity> findByIdAndReportAssignmentId(UUID id, UUID reportAssignmentId);
}
