package com.gec.backend.messaging.repository;

import com.gec.backend.messaging.entity.PublicOtpChallengeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PublicOtpChallengeRepository extends JpaRepository<PublicOtpChallengeEntity, UUID> {
    Optional<PublicOtpChallengeEntity> findTopByPhoneNumberNormalizedAndInvalidatedAtIsNullAndVerifiedAtIsNullOrderByCreatedAtDesc(String phoneNumberNormalized);
    List<PublicOtpChallengeEntity> findByPhoneNumberNormalizedAndInvalidatedAtIsNullAndVerifiedAtIsNull(String phoneNumberNormalized);
}
