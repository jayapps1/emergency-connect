package com.gec.backend.publicuser.repository;

import com.gec.backend.publicuser.entity.PublicUserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PublicUserRepository extends JpaRepository<PublicUserEntity, UUID> {
    Optional<PublicUserEntity> findByPhoneNumberNormalized(String phoneNumberNormalized);
    boolean existsByPhoneNumberNormalized(String phoneNumberNormalized);
}
