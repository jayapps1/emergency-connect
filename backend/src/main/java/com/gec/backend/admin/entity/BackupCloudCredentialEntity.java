package com.gec.backend.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "backup_cloud_credential")
public class BackupCloudCredentialEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 50)
    private String provider = "GOOGLE_DRIVE";

    @Column(name = "authorized_account")
    private String authorizedAccount;

    @Column(name = "encrypted_refresh_token", columnDefinition = "TEXT")
    private String encryptedRefreshToken;

    @Column(columnDefinition = "TEXT")
    private String scopes;

    @Column(name = "target_folder_id", nullable = false, length = 100)
    private String targetFolderId = "1H1PXcLzevcjRs02nqOlX3CNgedE3hswY";

    @Column(nullable = false, length = 50)
    private String status = "CONNECTED";

    @Column(name = "connected_at", nullable = false)
    private LocalDateTime connectedAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public BackupCloudCredentialEntity() {}

    public BackupCloudCredentialEntity(UUID id, String provider, String authorizedAccount, String encryptedRefreshToken, String scopes, String targetFolderId) {
        this.id = id;
        this.provider = provider != null ? provider : "GOOGLE_DRIVE";
        this.authorizedAccount = authorizedAccount;
        this.encryptedRefreshToken = encryptedRefreshToken;
        this.scopes = scopes;
        this.targetFolderId = targetFolderId != null ? targetFolderId : "1H1PXcLzevcjRs02nqOlX3CNgedE3hswY";
        this.status = "CONNECTED";
        this.connectedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getAuthorizedAccount() { return authorizedAccount; }
    public void setAuthorizedAccount(String authorizedAccount) { this.authorizedAccount = authorizedAccount; }
    public String getEncryptedRefreshToken() { return encryptedRefreshToken; }
    public void setEncryptedRefreshToken(String encryptedRefreshToken) { this.encryptedRefreshToken = encryptedRefreshToken; }
    public String getScopes() { return scopes; }
    public void setScopes(String scopes) { this.scopes = scopes; }
    public String getTargetFolderId() { return targetFolderId; }
    public void setTargetFolderId(String targetFolderId) { this.targetFolderId = targetFolderId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getConnectedAt() { return connectedAt; }
    public void setConnectedAt(LocalDateTime connectedAt) { this.connectedAt = connectedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
