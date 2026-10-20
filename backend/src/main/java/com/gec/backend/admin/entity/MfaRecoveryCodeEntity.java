package com.gec.backend.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mfa_recovery_code")
public class MfaRecoveryCodeEntity {

    @Id
    private UUID id;

    @Column(name = "user_type", nullable = false)
    private String userType = "ADMIN";

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public MfaRecoveryCodeEntity() {}

    public MfaRecoveryCodeEntity(UUID id, String userType, UUID userId, String codeHash) {
        this.id = id;
        this.userType = userType;
        this.userId = userId;
        this.codeHash = codeHash;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getUserType() { return userType; }
    public void setUserType(String userType) { this.userType = userType; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getCodeHash() { return codeHash; }
    public void setCodeHash(String codeHash) { this.codeHash = codeHash; }
    public LocalDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(LocalDateTime usedAt) { this.usedAt = usedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
