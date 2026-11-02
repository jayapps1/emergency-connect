package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.UserManagementRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserManagementRequestRepository extends JpaRepository<UserManagementRequestEntity, UUID> {
    List<UserManagementRequestEntity> findAllByOrderByCreatedAtDesc();
    List<UserManagementRequestEntity> findByStatusOrderByCreatedAtDesc(String status);
    List<UserManagementRequestEntity> findByAgencyIdOrderByCreatedAtDesc(UUID agencyId);
    Optional<UserManagementRequestEntity> findTopByRequestedByAndRequestTypeAndStatusInOrderByCreatedAtDesc(UUID requestedBy, String requestType, List<String> statuses);
}
