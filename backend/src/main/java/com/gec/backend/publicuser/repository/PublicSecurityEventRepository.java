package com.gec.backend.publicuser.repository;

import com.gec.backend.publicuser.entity.PublicSecurityEventEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface PublicSecurityEventRepository extends JpaRepository<PublicSecurityEventEntity, UUID> {
    Page<PublicSecurityEventEntity> findByPublicUserIdOrderByCreatedAtDesc(UUID publicUserId, Pageable pageable);
}
