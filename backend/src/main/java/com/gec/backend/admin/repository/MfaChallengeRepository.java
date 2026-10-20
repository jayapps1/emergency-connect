package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.MfaChallengeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface MfaChallengeRepository extends JpaRepository<MfaChallengeEntity, UUID> {
    Optional<MfaChallengeEntity> findByChallengeToken(String challengeToken);
    void deleteByUserId(UUID userId);
}
