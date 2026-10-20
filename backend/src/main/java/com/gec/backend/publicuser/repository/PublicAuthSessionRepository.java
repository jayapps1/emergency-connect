package com.gec.backend.publicuser.repository;

import com.gec.backend.publicuser.entity.PublicAuthSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PublicAuthSessionRepository extends JpaRepository<PublicAuthSessionEntity, UUID> {
    Optional<PublicAuthSessionEntity> findByRefreshTokenHash(String refreshTokenHash);
    List<PublicAuthSessionEntity> findByPublicUserIdAndRevokedAtIsNullOrderByLastUsedAtDesc(UUID publicUserId);
    List<PublicAuthSessionEntity> findByPublicUserIdAndRevokedAtIsNull(UUID publicUserId);
}
