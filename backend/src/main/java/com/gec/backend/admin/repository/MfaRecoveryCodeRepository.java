package com.gec.backend.admin.repository;

import com.gec.backend.admin.entity.MfaRecoveryCodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MfaRecoveryCodeRepository extends JpaRepository<MfaRecoveryCodeEntity, UUID> {
    List<MfaRecoveryCodeEntity> findByUserIdAndUsedAtIsNull(UUID userId);
    Optional<MfaRecoveryCodeEntity> findByUserIdAndCodeHashAndUsedAtIsNull(UUID userId, String codeHash);
    void deleteByUserId(UUID userId);
}
