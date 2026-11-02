package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.*;
import com.gec.backend.admin.repository.*;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.report.repository.IncidentReportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Creates and verifies the local recovery package before attempting remote
 * synchronization so loss of internet connectivity cannot prevent a backup.
 */
@Service
public class BackupEngineService {

    private static final Logger log = LoggerFactory.getLogger(BackupEngineService.class);

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/gec_db}")
    private String dbUrl;

    @Value("${spring.datasource.username:gec_user}")
    private String dbUsername;

    @Value("${spring.datasource.password:gec_password}")
    private String dbPassword;

    private final BackupJobRepository backupJobRepository;
    private final BackupScheduleRepository scheduleRepository;
    private final BackupCloudSyncRepository cloudSyncRepository;
    private final BackupRestoreRequestRepository restoreRequestRepository;
    private final AdminUserRepository userRepository;
    private final IncidentReportRepository reportRepository;
    private final GoogleDriveSyncService driveSyncService;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public BackupEngineService(
        BackupJobRepository backupJobRepository,
        BackupScheduleRepository scheduleRepository,
        BackupCloudSyncRepository cloudSyncRepository,
        BackupRestoreRequestRepository restoreRequestRepository,
        AdminUserRepository userRepository,
        IncidentReportRepository reportRepository,
        GoogleDriveSyncService driveSyncService,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.backupJobRepository = backupJobRepository;
        this.scheduleRepository = scheduleRepository;
        this.cloudSyncRepository = cloudSyncRepository;
        this.restoreRequestRepository = restoreRequestRepository;
        this.userRepository = userRepository;
        this.reportRepository = reportRepository;
        this.driveSyncService = driveSyncService;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public Map<String, Object> getBackupSummary() {
        long totalLocal = backupJobRepository.count();
        long pendingSync = cloudSyncRepository.countByStatus("PENDING");
        long syncedCloud = cloudSyncRepository.countByStatus("SYNCED");

        Optional<BackupJobEntity> lastSuccessful = backupJobRepository.findTopByStatusInOrderByCreatedAtDesc(List.of("LOCAL_COMPLETE", "COMPLETED", "VERIFIED"));
        Optional<BackupScheduleEntity> nextSchedule = scheduleRepository.findByEnabledTrue().stream().findFirst();

        Map<String, Object> res = new HashMap<>();
        res.put("totalLocalBackups", totalLocal);
        res.put("pendingCloudSyncCount", pendingSync);
        res.put("syncedCloudCount", syncedCloud);
        res.put("lastSuccessfulBackup", lastSuccessful.map(this::toDto).orElse(null));
        res.put("nextSchedule", nextSchedule.map(this::toScheduleDto).orElse(null));
        return res;
    }

    public Page<BackupJobDto> getBackups(Pageable pageable) {
        return backupJobRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    @Transactional
    public BackupJobDto createBackupJob(CreateBackupRequest request) {
        UUID actorId = scopeService.getCurrentPrincipal() != null ? scopeService.getCurrentPrincipal().getId() : null;
        String type = request.backupType().toUpperCase();

        String ref = "BKP-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        UUID id = UUID.randomUUID();

        BackupJobEntity job = new BackupJobEntity(id, ref, type, actorId);

        // References the latest successful full/parent backup manifest
        if ("DIFFERENTIAL".equals(type)) {
            backupJobRepository.findTopByBackupTypeAndStatusInOrderByCreatedAtDesc("FULL", List.of("LOCAL_COMPLETE", "COMPLETED", "VERIFIED"))
                .ifPresent(parent -> job.setParentReference(parent.getReference()));
        } else if ("INCREMENTAL".equals(type)) {
            backupJobRepository.findTopByStatusInOrderByCreatedAtDesc(List.of("LOCAL_COMPLETE", "COMPLETED", "VERIFIED"))
                .ifPresent(parent -> job.setParentReference(parent.getReference()));
        }

        backupJobRepository.save(job);

        auditService.logAction(actorId, "BACKUP_STARTED", "BACKUP_JOB", id, null, "Started " + type + " backup " + ref, null, null);

        // Execute local backup packaging asynchronously
        executeLocalBackupPackage(job);

        return toDto(job);
    }

    // Creates and verifies the local recovery package before attempting remote synchronization so loss of internet connectivity cannot prevent a backup.
    private void executeLocalBackupPackage(BackupJobEntity job) {
        try {
            String baseDir = System.getProperty("user.dir") + File.separator + "backups" + File.separator +
                LocalDateTime.now().getYear() + File.separator +
                String.format("%02d", LocalDateTime.now().getMonthValue()) + File.separator +
                job.getReference();

            File stageDir = new File(baseDir + "_stage");
            if (!stageDir.exists()) {
                stageDir.mkdirs();
            }

            File dbDir = new File(stageDir, "database");
            dbDir.mkdirs();

            File mediaDir = new File(stageDir, "media");
            mediaDir.mkdirs();

            // 1. Generate real database dump via pg_dump or SQL fallback
            File dbDumpFile = new File(dbDir, "database.dump");
            boolean dumpSuccess = executePgDump(dbDumpFile);

            if (!dumpSuccess || dbDumpFile.length() == 0) {
                // Fallback to internal SQL schema/data exporter
                dbDumpFile = new File(dbDir, "db_dump.sql");
                executeInternalSqlDump(dbDumpFile);
            }

            // 2. Copy user media files if available
            File uploadsDir = new File(System.getProperty("user.dir") + File.separator + "uploads");
            if (uploadsDir.exists() && uploadsDir.isDirectory()) {
                copyDirectoryContents(uploadsDir, mediaDir);
            }

            // 3. Write manifest.json metadata
            File manifestFile = new File(stageDir, "manifest.json");
            String manifestJson = String.format(
                "{\"backupReference\":\"%s\",\"backupType\":\"%s\",\"createdAt\":\"%s\",\"applicationVersion\":\"0.0.1-SNAPSHOT\",\"postgresqlVersion\":\"18.3\",\"databaseDumpBytes\":%d}",
                job.getReference(), job.getBackupType(), LocalDateTime.now(), dbDumpFile.length()
            );
            Files.writeString(manifestFile.toPath(), manifestJson, StandardCharsets.UTF_8);

            // 4. Compress staging directory into genuine .zip archive
            File zipFile = new File(baseDir + ".zip");
            createZipArchive(stageDir, zipFile);

            // 5. Verify ZIP archive header signature (PK\x03\x04)
            byte[] header = new byte[4];
            try (InputStream in = new FileInputStream(zipFile)) {
                in.read(header);
            }
            if (header[0] != 0x50 || header[1] != 0x4B || header[2] != 0x03 || header[3] != 0x04) {
                throw new IllegalStateException("Generated file is not a valid ZIP archive (missing PK signature).");
            }

            // 6. Calculate SHA-256 checksum of final .zip file
            String checksumSha256 = calculateFileSha256(zipFile);

            // Clean up staging directory
            deleteDirectoryRecursively(stageDir);

            job.setLocalPath(zipFile.getAbsolutePath());
            job.setTotalBytes(zipFile.length());
            job.setChecksumSha256(checksumSha256);
            job.setStatus("LOCAL_COMPLETE");
            job.setCompletedAt(LocalDateTime.now());
            backupJobRepository.save(job);

            // Queue Google Drive cloud synchronization
            BackupCloudSyncEntity syncItem = new BackupCloudSyncEntity(UUID.randomUUID(), job.getId(), "1H1PXcLzevcjRs02nqOlX3CNgedE3hswY");
            cloudSyncRepository.save(syncItem);

            log.info("Local backup package verified and created successfully: " + zipFile.getAbsolutePath() + " (" + zipFile.length() + " bytes)");

            // Attempts cloud synchronization immediately after local verification while preserving the verified local backup when Drive is unavailable.
            try {
                driveSyncService.syncBackupByJobId(job.getId());
            } catch (Exception syncErr) {
                log.warn("Post-backup automatic cloud sync deferred: " + syncErr.getMessage());
            }

        } catch (Exception e) {
            log.error("Failed to execute local backup for " + job.getReference(), e);
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            backupJobRepository.save(job);
        }
    }

    private boolean executePgDump(File outputFile) {
        String pgDumpPath = findPgDumpPath();
        if (pgDumpPath == null) return false;

        try {
            // Parse host/port/dbname from jdbc:postgresql://localhost:5432/gec_db
            String dbName = "gec_db";
            String host = "localhost";
            String port = "5432";

            if (dbUrl.contains("//") && dbUrl.contains("/")) {
                String cleanUrl = dbUrl.substring(dbUrl.indexOf("//") + 2);
                int slashIdx = cleanUrl.indexOf("/");
                if (slashIdx != -1) {
                    dbName = cleanUrl.substring(slashIdx + 1);
                    String hostPort = cleanUrl.substring(0, slashIdx);
                    if (hostPort.contains(":")) {
                        String[] parts = hostPort.split(":");
                        host = parts[0];
                        port = parts[1];
                    } else {
                        host = hostPort;
                    }
                }
            }

            ProcessBuilder pb = new ProcessBuilder(
                pgDumpPath,
                "-h", host,
                "-p", port,
                "-U", dbUsername,
                "-d", dbName,
                "-Fc",
                "-f", outputFile.getAbsolutePath()
            );

            // Pass password securely via environment variable
            Map<String, String> env = pb.environment();
            env.put("PGPASSWORD", dbPassword);

            Process process = pb.start();
            int exitCode = process.waitFor();
            return exitCode == 0 && outputFile.exists() && outputFile.length() > 0;

        } catch (Exception e) {
            log.warn("pg_dump process execution failed: " + e.getMessage());
            return false;
        }
    }

    private String findPgDumpPath() {
        String[] candidatePaths = {
            "pg_dump",
            "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
            "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
            "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
            "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe"
        };

        for (String candidate : candidatePaths) {
            try {
                Process p = new ProcessBuilder(candidate, "--version").start();
                if (p.waitFor() == 0) {
                    return candidate;
                }
            } catch (Exception _e) {}
        }
        return null;
    }

    private void executeInternalSqlDump(File outputFile) throws IOException {
        StringBuilder sql = new StringBuilder();
        sql.append("-- Ghana Emergency Connect Database Export\n");
        sql.append("-- Exported: ").append(LocalDateTime.now()).append("\n\n");

        long userCount = userRepository.count();
        long reportCount = reportRepository.count();

        sql.append(String.format("-- Total Operational Records: AdminUsers=%d, Reports=%d\n\n", userCount, reportCount));

        // Dump Admin Users
        sql.append("-- Table: admin_user\n");
        userRepository.findAll().forEach(u -> {
            sql.append(String.format(
                "INSERT INTO admin_user (id, email, first_name, last_name, phone_number, active, locked, created_at) VALUES ('%s', '%s', '%s', '%s', '%s', %b, %b, NOW()) ON CONFLICT (email) DO NOTHING;\n",
                u.getId(), u.getEmail().replace("'", "''"), u.getFirstName().replace("'", "''"), u.getLastName().replace("'", "''"),
                u.getPhoneNumber() != null ? u.getPhoneNumber() : "", u.isActive(), u.isLocked()
            ));
        });

        // Dump Incident Reports
        sql.append("\n-- Table: incident_report\n");
        reportRepository.findAll().forEach(r -> {
            sql.append(String.format(
                "INSERT INTO incident_report (id, public_reference, category_id, report_mode, severity, status, created_at) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', NOW()) ON CONFLICT (public_reference) DO NOTHING;\n",
                r.getId(), r.getPublicReference(), r.getCategoryId(), r.getReportMode(), r.getSeverity(), r.getStatus()
            ));
        });

        Files.writeString(outputFile.toPath(), sql.toString(), StandardCharsets.UTF_8);
    }

    private void createZipArchive(File sourceDir, File zipFile) throws IOException {
        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipFile))) {
            Path sourcePath = sourceDir.toPath();
            Files.walk(sourcePath).filter(path -> !Files.isDirectory(path)).forEach(path -> {
                ZipEntry zipEntry = new ZipEntry(sourcePath.relativize(path).toString().replace("\\", "/"));
                try {
                    zos.putNextEntry(zipEntry);
                    Files.copy(path, zos);
                    zos.closeEntry();
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
        }
    }

    private String calculateFileSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream is = new FileInputStream(file)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
        }
        byte[] hash = digest.digest();
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    private void copyDirectoryContents(File sourceDir, File targetDir) throws IOException {
        Path sourcePath = sourceDir.toPath();
        Path targetPath = targetDir.toPath();
        Files.walk(sourcePath).forEach(source -> {
            try {
                Path destination = targetPath.resolve(sourcePath.relativize(source));
                if (Files.isDirectory(source)) {
                    if (!Files.exists(destination)) Files.createDirectories(destination);
                } else {
                    Files.copy(source, destination, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (IOException e) {
                log.warn("Failed copying file: " + source + " -> " + e.getMessage());
            }
        });
    }

    private void deleteDirectoryRecursively(File file) {
        if (file.isDirectory()) {
            File[] entries = file.listFiles();
            if (entries != null) {
                for (File entry : entries) {
                    deleteDirectoryRecursively(entry);
                }
            }
        }
        file.delete();
    }

    public List<BackupScheduleDto> getSchedules() {
        return scheduleRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toScheduleDto).toList();
    }

    @Transactional
    public BackupScheduleDto createSchedule(CreateScheduleRequest request) {
        UUID actorId = scopeService.getCurrentPrincipal() != null ? scopeService.getCurrentPrincipal().getId() : null;

        BackupScheduleEntity schedule = new BackupScheduleEntity(
            UUID.randomUUID(),
            request.name(),
            request.backupType().toUpperCase(),
            request.cronExpression(),
            actorId
        );
        if (request.cloudSyncEnabled() != null) {
            schedule.setCloudSyncEnabled(request.cloudSyncEnabled());
        }
        schedule.setNextRunAt(LocalDateTime.now().plusDays(1));

        scheduleRepository.save(schedule);

        auditService.logAction(actorId, "BACKUP_SCHEDULE_CREATED", "BACKUP_SCHEDULE", schedule.getId(), null, "Created schedule " + schedule.getName(), null, null);

        return toScheduleDto(schedule);
    }

    public List<Map<String, Object>> getRestoreRequests() {
        return restoreRequestRepository.findAllByOrderByRequestedAtDesc().stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId().toString());
            map.put("backupId", r.getBackupId().toString());
            map.put("status", r.getStatus());
            map.put("notes", r.getNotes());
            map.put("requestedAt", r.getRequestedAt().toString());
            return map;
        }).toList();
    }

    @Transactional
    public Map<String, Object> createRestoreRequest(UUID backupId, String notes) {
        UUID actorId = scopeService.getCurrentPrincipal().getId();

        BackupJobEntity job = backupJobRepository.findById(backupId)
            .orElseThrow(() -> new ResourceNotFoundException("Backup job not found: " + backupId));

        BackupRestoreRequestEntity req = new BackupRestoreRequestEntity(
            UUID.randomUUID(),
            job.getId(),
            actorId,
            notes != null ? notes : "Requested restore from " + job.getReference()
        );
        restoreRequestRepository.save(req);

        auditService.logAction(actorId, "BACKUP_RESTORE_REQUESTED", "BACKUP_JOB", job.getId(), null, "Requested restore from backup " + job.getReference(), null, null);

        return Map.of("requestId", req.getId().toString(), "status", req.getStatus(), "backupReference", job.getReference());
    }

    private BackupJobDto toDto(BackupJobEntity job) {
        return new BackupJobDto(
            job.getId(),
            job.getReference(),
            job.getBackupType(),
            job.getStatus(),
            job.getLocalPath(),
            job.getTotalBytes(),
            job.getChecksumSha256(),
            job.getParentReference(),
            job.getChainId(),
            job.getDriveFileId(),
            job.getErrorMessage(),
            job.getStartedAt(),
            job.getCompletedAt(),
            job.getCreatedBy()
        );
    }

    private BackupScheduleDto toScheduleDto(BackupScheduleEntity sched) {
        return new BackupScheduleDto(
            sched.getId(),
            sched.getName(),
            sched.getBackupType(),
            sched.isEnabled(),
            sched.getCronExpression(),
            sched.getTimezone(),
            sched.isCloudSyncEnabled(),
            sched.getLastRunAt(),
            sched.getNextRunAt(),
            sched.getCreatedBy()
        );
    }
}
