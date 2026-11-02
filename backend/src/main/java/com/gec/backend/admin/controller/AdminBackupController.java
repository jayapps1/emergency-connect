package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.BackupEngineService;
import com.gec.backend.admin.service.GoogleDriveSyncService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/backups")
public class AdminBackupController {

    private final BackupEngineService backupEngineService;
    private final GoogleDriveSyncService driveSyncService;

    public AdminBackupController(BackupEngineService backupEngineService, GoogleDriveSyncService driveSyncService) {
        this.backupEngineService = backupEngineService;
        this.driveSyncService = driveSyncService;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ROLE_SYSTEM_ADMIN', 'ROLE_BACKUP_OPERATOR') or hasAuthority('BACKUP_READ')")
    public ResponseEntity<Map<String, Object>> getBackupSummary() {
        return ResponseEntity.ok(backupEngineService.getBackupSummary());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ROLE_SYSTEM_ADMIN', 'ROLE_BACKUP_OPERATOR') or hasAuthority('BACKUP_READ')")
    public ResponseEntity<Page<BackupJobDto>> getBackups(Pageable pageable) {
        return ResponseEntity.ok(backupEngineService.getBackups(pageable));
    }

    @PostMapping("/run")
    @PreAuthorize("hasAuthority('BACKUP_RUN_FULL') or hasAuthority('BACKUP_RUN_DIFFERENTIAL') or hasAuthority('BACKUP_RUN_INCREMENTAL')")
    public ResponseEntity<BackupJobDto> runBackupJob(@Valid @RequestBody CreateBackupRequest request) {
        return ResponseEntity.ok(backupEngineService.createBackupJob(request));
    }

    @GetMapping("/schedules")
    @PreAuthorize("hasAnyRole('ROLE_SYSTEM_ADMIN', 'ROLE_BACKUP_OPERATOR') or hasAuthority('BACKUP_READ')")
    public ResponseEntity<List<BackupScheduleDto>> getSchedules() {
        return ResponseEntity.ok(backupEngineService.getSchedules());
    }

    @PostMapping("/schedules")
    @PreAuthorize("hasAuthority('BACKUP_SCHEDULE_MANAGE')")
    public ResponseEntity<BackupScheduleDto> createSchedule(@Valid @RequestBody CreateScheduleRequest request) {
        return ResponseEntity.ok(backupEngineService.createSchedule(request));
    }

    @GetMapping("/sync-queue")
    @PreAuthorize("hasAnyRole('ROLE_SYSTEM_ADMIN', 'ROLE_BACKUP_OPERATOR') or hasAuthority('BACKUP_READ')")
    public ResponseEntity<List<?>> getPendingSyncQueue() {
        return ResponseEntity.ok(driveSyncService.getPendingSyncQueue());
    }

    @PostMapping("/{backupId}/sync")
    @PreAuthorize("hasAuthority('BACKUP_SYNC')")
    public ResponseEntity<Map<String, Object>> syncBackupByJobId(@PathVariable UUID backupId) {
        boolean success = driveSyncService.syncBackupByJobId(backupId);
        return ResponseEntity.ok(Map.of("backupId", backupId.toString(), "synced", success));
    }

    @PostMapping("/sync/{syncQueueId}")
    @PreAuthorize("hasAuthority('BACKUP_SYNC')")
    public ResponseEntity<Map<String, Object>> syncBackupToDrive(@PathVariable UUID syncQueueId) {
        boolean success = driveSyncService.syncBackupToDrive(syncQueueId);
        return ResponseEntity.ok(Map.of("syncQueueId", syncQueueId.toString(), "synced", success));
    }

    @PostMapping("/sync-all-pending")
    @PreAuthorize("hasAuthority('BACKUP_SYNC')")
    public ResponseEntity<Map<String, Object>> syncAllPending() {
        int count = driveSyncService.syncAllPending();
        return ResponseEntity.ok(Map.of("syncedCount", count));
    }

    @GetMapping("/oauth/authorize")
    @PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> getOAuthAuthorizationUrl(
        @AuthenticationPrincipal AdminUserPrincipal principal
    ) {
        UUID actorId = principal != null ? principal.getId() : null;
        String url = driveSyncService.buildAuthorizationUrl(actorId);
        return ResponseEntity.ok(Map.of("authorizationUrl", url));
    }

    // Allows Google's browser redirect to reach the OAuth callback without a GEC bearer token while one-time server-side state protects the authorization flow.
    @GetMapping("/oauth/callback")
    public ResponseEntity<Void> handleOAuthCallback(
        @RequestParam(required = false) String code,
        @RequestParam(required = false) String state,
        @RequestParam(required = false) String error,
        HttpServletResponse response
    ) throws IOException {
        String redirectTarget = driveSyncService.handleOAuthCallback(code, state, error);
        response.sendRedirect(redirectTarget);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/oauth/status")
    @PreAuthorize("hasAnyRole('ROLE_SYSTEM_ADMIN', 'ROLE_BACKUP_OPERATOR') or hasAuthority('BACKUP_READ')")
    public ResponseEntity<Map<String, Object>> getOAuthStatus() {
        return ResponseEntity.ok(driveSyncService.getOAuthStatus());
    }

    @PostMapping("/oauth/disconnect")
    @PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Void> disconnectOAuth(@AuthenticationPrincipal AdminUserPrincipal principal) {
        UUID actorId = principal != null ? principal.getId() : null;
        driveSyncService.disconnectDrive(actorId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/test-drive-connection")
    @PreAuthorize("hasAuthority('BACKUP_READ') or hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, Object>> testDriveConnection() {
        return ResponseEntity.ok(driveSyncService.testDriveConnection());
    }

    @GetMapping("/restore-requests")
    @PreAuthorize("hasAnyRole('ROLE_SYSTEM_ADMIN', 'ROLE_BACKUP_OPERATOR') or hasAuthority('BACKUP_READ')")
    public ResponseEntity<List<Map<String, Object>>> getRestoreRequests() {
        return ResponseEntity.ok(backupEngineService.getRestoreRequests());
    }

    @PostMapping("/restore-requests")
    @PreAuthorize("hasAuthority('BACKUP_RESTORE_REQUEST')")
    public ResponseEntity<Map<String, Object>> createRestoreRequest(
        @RequestParam UUID backupId,
        @RequestParam(required = false) String notes
    ) {
        return ResponseEntity.ok(backupEngineService.createRestoreRequest(backupId, notes));
    }
}
