package com.gec.backend.appliance.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.appliance.entity.ResponseApplianceEntity;
import com.gec.backend.appliance.entity.ResponseApplianceStatusHistoryEntity;
import com.gec.backend.appliance.repository.ResponseApplianceRepository;
import com.gec.backend.appliance.repository.ResponseApplianceStatusHistoryRepository;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * System Admin manages internal identities but has read-only visibility
 * into agency appliance operations.
 */
@Service
public class ResponseAvailabilityService {

    private final ResponseApplianceRepository applianceRepository;
    private final ResponseApplianceStatusHistoryRepository historyRepository;
    private final StationRepository stationRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public ResponseAvailabilityService(
        ResponseApplianceRepository applianceRepository,
        ResponseApplianceStatusHistoryRepository historyRepository,
        StationRepository stationRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.applianceRepository = applianceRepository;
        this.historyRepository = historyRepository;
        this.stationRepository = stationRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public List<Map<String, Object>> getAdminAppliances() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        UUID targetAgencyId = scopeService.isSystemAdmin() ? null : principal.getAgencyId();

        List<ResponseApplianceEntity> list;
        if (targetAgencyId != null) {
            list = applianceRepository.findByAgencyId(targetAgencyId);
        } else {
            list = applianceRepository.findAll();
        }

        return list.stream().map(this::mapToDto).toList();
    }

    public Map<String, Object> getAgencyApplianceSummary() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        UUID targetAgencyId = scopeService.isSystemAdmin() ? null : principal.getAgencyId();

        List<ResponseApplianceEntity> list;
        if (targetAgencyId != null) {
            list = applianceRepository.findByAgencyId(targetAgencyId);
        } else {
            list = applianceRepository.findAll();
        }

        long total = list.size();
        long available = list.stream().filter(a -> "AVAILABLE".equalsIgnoreCase(a.getOperationalStatus())).count();
        long dispatched = list.stream().filter(a -> {
            String st = a.getOperationalStatus().toUpperCase();
            return "DISPATCHED".equals(st) || "EN_ROUTE".equals(st) || "ON_SCENE".equals(st);
        }).count();
        long outOfCommission = list.stream().filter(a -> "OUT_OF_COMMISSION".equalsIgnoreCase(a.getOperationalStatus())).count();
        long maintenance = list.stream().filter(a -> "MAINTENANCE".equalsIgnoreCase(a.getOperationalStatus())).count();

        return Map.of(
            "total", total,
            "available", available,
            "dispatched", dispatched,
            "outOfCommission", outOfCommission,
            "maintenance", maintenance
        );
    }

    @Transactional
    public Map<String, Object> createAppliance(Map<String, Object> request) {
        checkOperationalAccess();
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        UUID agencyId = principal.getAgencyId();

        String callSign = ((String) request.get("callSign")).trim().toUpperCase(Locale.US);
        if (applianceRepository.existsByCallSign(callSign)) {
            throw new ResourceConflictException("An appliance with call sign " + callSign + " already exists.");
        }

        UUID homeStationId = UUID.fromString((String) request.get("homeStationId"));
        String displayName = ((String) request.get("displayName")).trim();
        String resourceType = ((String) request.getOrDefault("resourceType", "FIRE_ENGINE")).trim().toUpperCase(Locale.US);
        String regNum = request.containsKey("registrationNumber") ? (String) request.get("registrationNumber") : null;

        ResponseApplianceEntity entity = new ResponseApplianceEntity(
            UUID.randomUUID(),
            agencyId,
            homeStationId,
            null,
            resourceType,
            callSign,
            regNum,
            displayName,
            "AVAILABLE"
        );

        applianceRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "APPLIANCE_CREATED",
            "RESPONSE_APPLIANCE",
            entity.getId(),
            agencyId,
            "Created appliance " + callSign + " (" + displayName + ")",
            null,
            null
        );

        return mapToDto(entity);
    }

    @Transactional
    public Map<String, Object> updateAppliance(UUID applianceId, Map<String, Object> request) {
        checkOperationalAccess();
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        ResponseApplianceEntity entity = applianceRepository.findById(applianceId)
            .orElseThrow(() -> new ResourceNotFoundException("Appliance not found: " + applianceId));

        scopeService.validateAgencyScope(entity.getAgencyId());

        if (request.containsKey("displayName") && request.get("displayName") != null) {
            entity.setDisplayName(((String) request.get("displayName")).trim());
        }
        if (request.containsKey("resourceType") && request.get("resourceType") != null) {
            entity.setResourceType(((String) request.get("resourceType")).trim().toUpperCase(Locale.US));
        }
        if (request.containsKey("registrationNumber")) {
            entity.setRegistrationNumber((String) request.get("registrationNumber"));
        }
        if (request.containsKey("homeStationId") && request.get("homeStationId") != null) {
            entity.setHomeStationId(UUID.fromString((String) request.get("homeStationId")));
        }

        entity.setUpdatedAt(LocalDateTime.now());
        applianceRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "APPLIANCE_UPDATED",
            "RESPONSE_APPLIANCE",
            applianceId,
            entity.getAgencyId(),
            "Updated appliance " + entity.getCallSign(),
            null,
            null
        );

        return mapToDto(entity);
    }

    @Transactional
    public Map<String, Object> updateApplianceStatus(UUID applianceId, String newStatus, String reason) {
        checkOperationalAccess();
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        ResponseApplianceEntity entity = applianceRepository.findById(applianceId)
            .orElseThrow(() -> new ResourceNotFoundException("Appliance not found: " + applianceId));

        scopeService.validateAgencyScope(entity.getAgencyId());

        String prevStatus = entity.getOperationalStatus();
        String targetStatus = newStatus.trim().toUpperCase(Locale.US);
        if ("EN_ROUTE".equals(targetStatus) || "ON_SCENE".equals(targetStatus) || "RETURNING".equals(targetStatus)) {
            targetStatus = "DISPATCHED";
        } else if ("TEMPORARILY_UNAVAILABLE".equals(targetStatus)) {
            targetStatus = "OUT_OF_COMMISSION";
        }

        entity.setOperationalStatus(targetStatus);
        entity.setStatusReason(reason != null ? reason.trim() : null);
        entity.setUpdatedAt(LocalDateTime.now());
        applianceRepository.save(entity);

        ResponseApplianceStatusHistoryEntity history = new ResponseApplianceStatusHistoryEntity(
            UUID.randomUUID(),
            applianceId,
            prevStatus,
            targetStatus,
            reason,
            null,
            principal.getId()
        );
        historyRepository.save(history);

        auditService.logAction(
            principal.getId(),
            "APPLIANCE_STATUS_UPDATED",
            "RESPONSE_APPLIANCE",
            applianceId,
            entity.getAgencyId(),
            "Updated appliance " + entity.getCallSign() + " status from " + prevStatus + " to " + targetStatus,
            null,
            null
        );

        return mapToDto(entity);
    }

    @Transactional
    public Map<String, Object> relocateAppliance(UUID applianceId, UUID newStationId) {
        checkOperationalAccess();
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        ResponseApplianceEntity entity = applianceRepository.findById(applianceId)
            .orElseThrow(() -> new ResourceNotFoundException("Appliance not found: " + applianceId));

        scopeService.validateAgencyScope(entity.getAgencyId());

        entity.setCurrentStationId(newStationId);
        entity.setUpdatedAt(LocalDateTime.now());
        applianceRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "APPLIANCE_RELOCATED",
            "RESPONSE_APPLIANCE",
            applianceId,
            entity.getAgencyId(),
            "Relocated appliance " + entity.getCallSign() + " to station " + newStationId,
            null,
            null
        );

        return mapToDto(entity);
    }

    @Transactional
    public Map<String, Object> returnToHomeStation(UUID applianceId) {
        checkOperationalAccess();
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        ResponseApplianceEntity entity = applianceRepository.findById(applianceId)
            .orElseThrow(() -> new ResourceNotFoundException("Appliance not found: " + applianceId));

        scopeService.validateAgencyScope(entity.getAgencyId());

        entity.setCurrentStationId(null);
        entity.setUpdatedAt(LocalDateTime.now());
        applianceRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "APPLIANCE_RETURNED_HOME",
            "RESPONSE_APPLIANCE",
            applianceId,
            entity.getAgencyId(),
            "Returned appliance " + entity.getCallSign() + " to home station",
            null,
            null
        );

        return mapToDto(entity);
    }

    @Transactional
    public Map<String, Object> deactivateAppliance(UUID applianceId) {
        checkOperationalAccess();
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        ResponseApplianceEntity entity = applianceRepository.findById(applianceId)
            .orElseThrow(() -> new ResourceNotFoundException("Appliance not found: " + applianceId));

        scopeService.validateAgencyScope(entity.getAgencyId());

        entity.setActive(false);
        entity.setOperationalStatus("OUT_OF_COMMISSION");
        entity.setStatusReason("Deactivated / Retired from operational service");
        entity.setUpdatedAt(LocalDateTime.now());
        applianceRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "APPLIANCE_DEACTIVATED",
            "RESPONSE_APPLIANCE",
            applianceId,
            entity.getAgencyId(),
            "Deactivated appliance " + entity.getCallSign(),
            null,
            null
        );

        return mapToDto(entity);
    }

    public List<Map<String, Object>> getApplianceHistory(UUID applianceId) {
        ResponseApplianceEntity entity = applianceRepository.findById(applianceId)
            .orElseThrow(() -> new ResourceNotFoundException("Appliance not found: " + applianceId));

        if (!scopeService.isSystemAdmin()) {
            scopeService.validateAgencyScope(entity.getAgencyId());
        }

        List<ResponseApplianceStatusHistoryEntity> historyList = historyRepository
            .findByApplianceIdOrderByChangedAtDesc(applianceId);

        return historyList.stream().map(h -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", h.getId().toString());
            dto.put("applianceId", h.getApplianceId().toString());
            dto.put("previousStatus", h.getPreviousStatus());
            dto.put("newStatus", h.getNewStatus());
            dto.put("reason", h.getReason());
            dto.put("incidentId", h.getIncidentId() != null ? h.getIncidentId().toString() : null);
            dto.put("changedBy", h.getChangedBy() != null ? h.getChangedBy().toString() : null);
            dto.put("changedAt", h.getChangedAt().toString());
            return dto;
        }).toList();
    }

    private void checkOperationalAccess() {
        if (scopeService.isSystemAdmin()) {
            throw new ResourceConflictException("System Administrators have national operational oversight access only and cannot execute operational appliance mutations.");
        }
    }

    private Map<String, Object> mapToDto(ResponseApplianceEntity entity) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", entity.getId().toString());
        dto.put("agencyId", entity.getAgencyId().toString());
        dto.put("homeStationId", entity.getHomeStationId().toString());
        dto.put("currentStationId", entity.getCurrentStationId() != null ? entity.getCurrentStationId().toString() : null);
        dto.put("effectiveStationId", entity.getEffectiveStationId().toString());
        dto.put("resourceType", entity.getResourceType());
        dto.put("callSign", entity.getCallSign());
        dto.put("registrationNumber", entity.getRegistrationNumber());
        dto.put("displayName", entity.getDisplayName());
        dto.put("operationalStatus", entity.getOperationalStatus());
        dto.put("statusReason", entity.getStatusReason());
        dto.put("active", entity.isActive());
        dto.put("updatedAt", entity.getUpdatedAt().toString());

        stationRepository.findById(entity.getHomeStationId()).ifPresent(s -> dto.put("homeStationName", s.getName()));
        UUID currId = entity.getEffectiveStationId();
        stationRepository.findById(currId).ifPresent(s -> dto.put("currentStationName", s.getName()));

        return dto;
    }
}
