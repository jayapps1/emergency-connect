package com.gec.backend.admin.service;

import com.gec.backend.admin.entity.BackupCloudCredentialEntity;
import com.gec.backend.admin.entity.BackupCloudSyncEntity;
import com.gec.backend.admin.entity.BackupJobEntity;
import com.gec.backend.admin.repository.BackupCloudCredentialRepository;
import com.gec.backend.admin.repository.BackupCloudSyncRepository;
import com.gec.backend.admin.repository.BackupJobRepository;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.FileContent;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.About;
import com.google.api.services.drive.model.File;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Uses the System Administrator-authorized Google account so My Drive uploads
 * consume the owner's available storage quota instead of the service account's
 * zero-quota storage context.
 */
@Service
public class GoogleDriveSyncService {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveSyncService.class);

    private static record OAuthStateRecord(
        String stateToken,
        UUID initiatingUserId,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        boolean used
    ) {}

    private final Map<String, OAuthStateRecord> stateRegistry = new ConcurrentHashMap<>();

    @Value("${gec.backup.drive.folder-id:1H1PXcLzevcjRs02nqOlX3CNgedE3hswY}")
    private String targetDriveFolderId;

    @Value("${gec.backup.drive.client-id:}")
    private String clientId;

    @Value("${gec.backup.drive.client-secret:}")
    private String clientSecret;

    @Value("${gec.backup.drive.redirect-uri:http://localhost:8099/api/v1/admin/backups/oauth/callback}")
    private String redirectUri;

    @Value("${gec.jwt.secret:defaultSecretKeyForDevelopmentMustBeAtLeast32BytesLongForHS256!}")
    private String encryptionSecretKey;

    private final BackupCloudSyncRepository syncRepository;
    private final BackupJobRepository jobRepository;
    private final BackupCloudCredentialRepository credentialRepository;
    private final AuditService auditService;

    public GoogleDriveSyncService(
        BackupCloudSyncRepository syncRepository,
        BackupJobRepository jobRepository,
        BackupCloudCredentialRepository credentialRepository,
        AuditService auditService
    ) {
        this.syncRepository = syncRepository;
        this.jobRepository = jobRepository;
        this.credentialRepository = credentialRepository;
        this.auditService = auditService;
    }

    @PostConstruct
    public void initConfigValidation() {
        boolean validClientId = clientId != null && !clientId.isBlank() && clientId.endsWith(".apps.googleusercontent.com");
        String maskedClientId = validClientId ? clientId.substring(0, Math.min(18, clientId.length())) + "..." : "NOT CONFIGURED";

        log.info("=== GEC Google Drive OAuth Configuration ===");
        log.info("Google Drive OAuth Client Configured: {}", validClientId ? "YES" : "NO (" + maskedClientId + ")");
        log.info("Redirect URI: {}", redirectUri);
        log.info("Target Drive Folder ID: {}", targetDriveFolderId);
    }

    public Map<String, Object> getOAuthStatus() {
        Optional<BackupCloudCredentialEntity> credOpt = credentialRepository.findTopByProviderAndStatusOrderByConnectedAtDesc("GOOGLE_DRIVE", "CONNECTED");
        Map<String, Object> res = new HashMap<>();
        res.put("targetFolderId", targetDriveFolderId);

        if (credOpt.isPresent()) {
            BackupCloudCredentialEntity cred = credOpt.get();
            res.put("connected", true);
            res.put("authorizedAccount", cred.getAuthorizedAccount() != null ? cred.getAuthorizedAccount() : "Authorized Google Account");
            res.put("connectedAt", cred.getConnectedAt().toString());
            res.put("provider", cred.getProvider());
        } else {
            res.put("connected", false);
            res.put("authorizedAccount", null);
            res.put("message", "GOOGLE_DRIVE_NOT_CONNECTED: Google Drive OAuth 2.0 user authorization has not been completed.");
        }
        return res;
    }

    // Associates the OAuth callback with the System Administrator who initiated the connection instead of trusting identity supplied by the browser redirect.
    public String buildAuthorizationUrl(UUID initiatingUserId) {
        if (clientId == null || clientId.isBlank() || !clientId.endsWith(".apps.googleusercontent.com")) {
            throw new IllegalStateException("Google Drive OAuth Client ID is not configured or invalid. Please configure GEC_GOOGLE_CLIENT_ID environment variable.");
        }

        String stateToken = UUID.randomUUID().toString();
        OAuthStateRecord record = new OAuthStateRecord(
            stateToken,
            initiatingUserId,
            LocalDateTime.now(),
            LocalDateTime.now().plusMinutes(10), // 10-minute state TTL
            false
        );
        stateRegistry.put(stateToken, record);

        return "https://accounts.google.com/o/oauth2/v2/auth?" +
            "client_id=" + clientId +
            "&redirect_uri=" + redirectUri +
            "&response_type=code" +
            "&scope=" + DriveScopes.DRIVE_FILE +
            "&access_type=offline" +
            "&prompt=consent" +
            "&state=" + stateToken;
    }

    // Allows Google's browser redirect to reach the OAuth callback without a GEC bearer token while one-time server-side state protects the authorization flow.
    @Transactional
    public String handleOAuthCallback(String code, String state, String error) {
        String frontendBase = "http://localhost:5173/backups";

        if (error != null && !error.isBlank()) {
            log.warn("Google OAuth callback returned user error: " + error);
            return frontendBase + "?oauth=error&reason=GOOGLE_AUTHORIZATION_CANCELLED";
        }

        if (state == null || state.isBlank() || !stateRegistry.containsKey(state)) {
            log.warn("Google OAuth callback received invalid or missing state nonce.");
            return frontendBase + "?oauth=error&reason=OAUTH_STATE_INVALID";
        }

        OAuthStateRecord record = stateRegistry.get(state);
        if (record.used() || record.expiresAt().isBefore(LocalDateTime.now())) {
            stateRegistry.remove(state);
            log.warn("Google OAuth callback received expired or replayed state nonce.");
            return frontendBase + "?oauth=error&reason=OAUTH_STATE_EXPIRED";
        }

        // Mark state used immediately (one-time use)
        stateRegistry.put(state, new OAuthStateRecord(record.stateToken(), record.initiatingUserId(), record.createdAt(), record.expiresAt(), true));

        try {
            GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                "https://oauth2.googleapis.com/token",
                clientId,
                clientSecret,
                code,
                redirectUri
            ).execute();

            String refreshToken = tokenResponse.getRefreshToken();
            String accessToken = tokenResponse.getAccessToken();

            if (refreshToken == null || refreshToken.isBlank()) {
                Optional<BackupCloudCredentialEntity> existing = credentialRepository.findTopByProviderAndStatusOrderByConnectedAtDesc("GOOGLE_DRIVE", "CONNECTED");
                if (existing.isPresent()) {
                    refreshToken = decrypt(existing.get().getEncryptedRefreshToken());
                }
            }

            if (refreshToken == null || refreshToken.isBlank()) {
                log.error("Google OAuth did not return a refresh token.");
                return frontendBase + "?oauth=error&reason=OAUTH_REFRESH_TOKEN_MISSING";
            }

            String userEmail = "OAuth Authorized Account";
            try {
                Drive drive = new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(GoogleCredentials.create(new AccessToken(accessToken, null)))
                ).setApplicationName("GhanaEmergencyConnect/1.0").build();

                About about = drive.about().get().setFields("user").execute();
                if (about != null && about.getUser() != null && about.getUser().getEmailAddress() != null) {
                    userEmail = about.getUser().getEmailAddress();
                }
            } catch (Exception e) {
                log.warn("Could not fetch Google user profile: " + e.getMessage());
            }

            String encryptedToken = encrypt(refreshToken);
            final String finalEmail = userEmail;

            BackupCloudCredentialEntity cred = credentialRepository.findTopByProviderAndStatusOrderByConnectedAtDesc("GOOGLE_DRIVE", "CONNECTED")
                .orElseGet(() -> new BackupCloudCredentialEntity(UUID.randomUUID(), "GOOGLE_DRIVE", finalEmail, encryptedToken, DriveScopes.DRIVE_FILE, targetDriveFolderId));

            cred.setAuthorizedAccount(userEmail);
            cred.setEncryptedRefreshToken(encryptedToken);
            cred.setStatus("CONNECTED");
            cred.setTargetFolderId(targetDriveFolderId);
            cred.setUpdatedAt(LocalDateTime.now());
            credentialRepository.save(cred);

            if (record.initiatingUserId() != null) {
                auditService.logAction(record.initiatingUserId(), "GOOGLE_DRIVE_CONNECTED", "CLOUD_CREDENTIAL", cred.getId(), null,
                    "Connected Google Drive account " + userEmail + " for folder " + targetDriveFolderId, null, null);
            }

            // Cleanup state registry
            stateRegistry.remove(state);

            return frontendBase + "?oauth=success";

        } catch (Exception e) {
            log.error("Failed to complete Google OAuth token exchange", e);
            return frontendBase + "?oauth=error&reason=OAUTH_TOKEN_EXCHANGE_FAILED";
        }
    }

    @Transactional
    public void disconnectDrive(UUID actorUserId) {
        Optional<BackupCloudCredentialEntity> credOpt = credentialRepository.findTopByProviderAndStatusOrderByConnectedAtDesc("GOOGLE_DRIVE", "CONNECTED");
        if (credOpt.isPresent()) {
            BackupCloudCredentialEntity cred = credOpt.get();
            cred.setStatus("DISCONNECTED");
            cred.setUpdatedAt(LocalDateTime.now());
            credentialRepository.save(cred);

            if (actorUserId != null) {
                auditService.logAction(actorUserId, "GOOGLE_DRIVE_DISCONNECTED", "CLOUD_CREDENTIAL", cred.getId(), null,
                    "Disconnected Google Drive authorization for " + cred.getAuthorizedAccount(), null, null);
            }
        }
    }

    // Stores only the encrypted OAuth refresh credential required for unattended scheduled backups and obtains short-lived access tokens when synchronization occurs.
    private Drive getDriveServiceFromOAuth() throws Exception {
        Optional<BackupCloudCredentialEntity> credOpt = credentialRepository.findTopByProviderAndStatusOrderByConnectedAtDesc("GOOGLE_DRIVE", "CONNECTED");

        if (credOpt.isEmpty()) {
            throw new IllegalStateException("GOOGLE_DRIVE_NOT_CONNECTED: Google Drive OAuth 2.0 user authorization is required. Please click 'Connect Google Drive' in Backup Settings.");
        }

        BackupCloudCredentialEntity cred = credOpt.get();
        String rawRefreshToken = decrypt(cred.getEncryptedRefreshToken());

        GoogleTokenResponse response = new GoogleRefreshTokenRequest(
            GoogleNetHttpTransport.newTrustedTransport(),
            GsonFactory.getDefaultInstance(),
            rawRefreshToken,
            clientId,
            clientSecret
        ).execute();

        String newAccessToken = response.getAccessToken();
        GoogleCredentials googleCreds = GoogleCredentials.create(new AccessToken(newAccessToken, null));

        return new Drive.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            GsonFactory.getDefaultInstance(),
            new HttpCredentialsAdapter(googleCreds)
        ).setApplicationName("GhanaEmergencyConnect-Backup/1.0").build();
    }

    public Map<String, Object> testDriveConnection() {
        Map<String, Object> result = new HashMap<>();
        result.put("targetFolderId", targetDriveFolderId);

        Optional<BackupCloudCredentialEntity> credOpt = credentialRepository.findTopByProviderAndStatusOrderByConnectedAtDesc("GOOGLE_DRIVE", "CONNECTED");
        if (credOpt.isEmpty()) {
            result.put("connected", false);
            result.put("writeTestPassed", false);
            result.put("serviceAccountEmail", null);
            result.put("message", "GOOGLE_DRIVE_NOT_CONNECTED: Google Drive OAuth 2.0 authorization has not been completed. Click 'Connect Google Drive' in Backup Settings.");
            return result;
        }

        try {
            Drive drive = getDriveServiceFromOAuth();
            String authorizedAccount = credOpt.get().getAuthorizedAccount();
            result.put("serviceAccountEmail", authorizedAccount);

            String testFileName = ".gec-drive-test-" + UUID.randomUUID().toString().substring(0, 8) + ".tmp";
            File testFileMeta = new File();
            testFileMeta.setName(testFileName);
            testFileMeta.setParents(Collections.singletonList(targetDriveFolderId));

            byte[] content = "GEC Drive Connection Verification Test".getBytes(StandardCharsets.UTF_8);
            com.google.api.client.http.ByteArrayContent mediaContent = new com.google.api.client.http.ByteArrayContent("text/plain", content);

            File createdTestFile = drive.files().create(testFileMeta, mediaContent)
                .setFields("id, name")
                .execute();

            if (createdTestFile != null && createdTestFile.getId() != null) {
                drive.files().delete(createdTestFile.getId()).execute();
            }

            result.put("folderName", "GEC backup_files");
            result.put("connected", true);
            result.put("writeTestPassed", true);
            result.put("message", "Successfully verified Google Drive OAuth user authorization and write access to folder " + targetDriveFolderId);

        } catch (Exception e) {
            log.warn("Google Drive test connection failed for folder " + targetDriveFolderId + ": " + e.getMessage());
            result.put("connected", false);
            result.put("writeTestPassed", false);
            result.put("error", e.getMessage() != null ? e.getMessage() : "Failed to connect to Google Drive API.");

            if (e.getMessage() != null && (e.getMessage().contains("storageQuotaExceeded") || e.getMessage().contains("403"))) {
                result.put("message", "NON_RETRYABLE_CONFIGURATION_ERROR: Storage quota exceeded or writer access required. Please re-connect Google Drive using System Administrator OAuth authorization.");
            } else {
                result.put("message", "Google Drive connection error: " + e.getMessage());
            }
        }

        return result;
    }

    public List<BackupCloudSyncEntity> getPendingSyncQueue() {
        return syncRepository.findByStatusIn(List.of("PENDING", "UPLOADING", "FAILED_RETRYABLE"));
    }

    // Retries only cloud uploads that are due, using bounded backoff so temporary network failures recover automatically without overwhelming Google Drive.
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void processPendingCloudSyncQueue() {
        Optional<BackupCloudCredentialEntity> credOpt = credentialRepository.findTopByProviderAndStatusOrderByConnectedAtDesc("GOOGLE_DRIVE", "CONNECTED");
        if (credOpt.isEmpty()) return; // Pause retry worker if Google Drive is not connected via OAuth

        List<BackupCloudSyncEntity> pendingItems = syncRepository.findByStatusIn(List.of("PENDING", "FAILED_RETRYABLE"));
        LocalDateTime now = LocalDateTime.now();

        for (BackupCloudSyncEntity item : pendingItems) {
            if (item.getNextAttemptAt() == null || !item.getNextAttemptAt().isAfter(now)) {
                syncBackupByJobId(item.getBackupId());
            }
        }
    }

    @Transactional
    public int syncAllPending() {
        List<BackupCloudSyncEntity> pendingItems = syncRepository.findByStatusIn(List.of("PENDING", "FAILED_RETRYABLE"));
        int count = 0;
        for (BackupCloudSyncEntity item : pendingItems) {
            if (syncBackupByJobId(item.getBackupId())) {
                count++;
            }
        }
        return count;
    }

    @Transactional
    public boolean syncBackupToDrive(UUID identifier) {
        Optional<BackupCloudSyncEntity> itemOpt = syncRepository.findById(identifier);
        if (itemOpt.isPresent()) {
            return syncBackupByJobId(itemOpt.get().getBackupId());
        }
        return syncBackupByJobId(identifier);
    }

    // Routes manual, bulk, automatic, and retry synchronization through one authoritative method so cloud status and error handling remain consistent.
    @Transactional
    public boolean syncBackupByJobId(UUID backupId) {
        BackupJobEntity job = jobRepository.findById(backupId)
            .orElseThrow(() -> new ResourceNotFoundException("Backup job not found: " + backupId));

        BackupCloudSyncEntity item = syncRepository.findByBackupId(backupId)
            .orElseGet(() -> {
                BackupCloudSyncEntity syncItem = new BackupCloudSyncEntity(UUID.randomUUID(), backupId, targetDriveFolderId);
                return syncRepository.save(syncItem);
            });

        // Idempotency Check: Prevent duplicate uploads for already synced backups
        if ("SYNCED".equals(item.getStatus()) && job.getDriveFileId() != null) {
            log.info("Backup " + job.getReference() + " is already synchronized with Google Drive file ID " + job.getDriveFileId());
            return true;
        }

        if (job.getLocalPath() == null) {
            item.setStatus("LOCAL_BACKUP_MISSING");
            item.setLastError("Backup has no local file path specified.");
            syncRepository.save(item);
            return false;
        }

        java.io.File zipFile = new java.io.File(job.getLocalPath());
        if (!zipFile.exists() || zipFile.length() == 0) {
            item.setStatus("LOCAL_BACKUP_MISSING");
            item.setLastError("Local backup archive file no longer exists or is empty: " + job.getLocalPath());
            syncRepository.save(item);
            return false;
        }

        item.setStatus("UPLOADING");
        item.setLastAttemptAt(LocalDateTime.now());
        int attempts = item.getAttemptCount() + 1;
        item.setAttemptCount(attempts);
        syncRepository.save(item);

        try {
            Drive drive = getDriveServiceFromOAuth();

            String uploadFileName = "GEC_" + job.getBackupType() + "_" + job.getReference() + ".zip";

            File fileMetadata = new File();
            fileMetadata.setName(uploadFileName);
            fileMetadata.setParents(Collections.singletonList(targetDriveFolderId));

            FileContent mediaContent = new FileContent("application/zip", zipFile);

            File uploadedFile = drive.files().create(fileMetadata, mediaContent)
                .setFields("id, name, webViewLink")
                .execute();

            String realDriveFileId = uploadedFile.getId();

            item.setRemoteFileId(realDriveFileId);
            item.setStatus("SYNCED");
            item.setCompletedAt(LocalDateTime.now());
            item.setLastError(null);
            syncRepository.save(item);

            job.setDriveFileId(realDriveFileId);
            if ("LOCAL_COMPLETE".equals(job.getStatus())) {
                job.setStatus("COMPLETED");
            }
            jobRepository.save(job);

            log.info("Successfully synced real backup package " + job.getReference() + " (" + zipFile.length() + " bytes) to Google Drive folder " + targetDriveFolderId + " with Drive File ID " + realDriveFileId);
            return true;

        } catch (Exception e) {
            log.warn("Cloud sync attempt " + attempts + " failed for backup " + job.getReference() + ": " + e.getMessage());

            String errorMsg = e.getMessage() != null ? e.getMessage() : "Network failure during Google Drive upload.";
            if (errorMsg.contains("storageQuotaExceeded") || errorMsg.contains("403")) {
                item.setStatus("NON_RETRYABLE_CONFIGURATION_ERROR");
                item.setLastError("NON_RETRYABLE_CONFIGURATION_ERROR: Storage quota exceeded or writer access required. Please re-connect Google Drive using System Administrator OAuth user authorization.");
            } else if (errorMsg.contains("GOOGLE_DRIVE_NOT_CONNECTED")) {
                item.setStatus("PENDING_CONFIGURATION");
                item.setLastError(errorMsg);
            } else {
                item.setStatus("FAILED_RETRYABLE");
                item.setLastError(errorMsg);
                int backoffMins = attempts == 1 ? 1 : attempts == 2 ? 5 : attempts == 3 ? 15 : attempts == 4 ? 30 : 60;
                item.setNextAttemptAt(LocalDateTime.now().plusMinutes(backoffMins));
            }

            syncRepository.save(item);
            return false;
        }
    }

    private String encrypt(String rawText) throws Exception {
        byte[] keyBytes = MessageDigest.getInstance("SHA-256").digest(encryptionSecretKey.getBytes(StandardCharsets.UTF_8));
        SecretKeySpec keySpec = new SecretKeySpec(Arrays.copyOf(keyBytes, 16), "AES");
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        return Base64.getEncoder().encodeToString(cipher.doFinal(rawText.getBytes(StandardCharsets.UTF_8)));
    }

    private String decrypt(String encryptedText) throws Exception {
        byte[] keyBytes = MessageDigest.getInstance("SHA-256").digest(encryptionSecretKey.getBytes(StandardCharsets.UTF_8));
        SecretKeySpec keySpec = new SecretKeySpec(Arrays.copyOf(keyBytes, 16), "AES");
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.DECRYPT_MODE, keySpec);
        return new String(cipher.doFinal(Base64.getDecoder().decode(encryptedText)), StandardCharsets.UTF_8);
    }
}
