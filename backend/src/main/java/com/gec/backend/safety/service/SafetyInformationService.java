package com.gec.backend.safety.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.notification.service.PublicNotificationService;
import com.gec.backend.safety.dto.CreateSafetyInformationRequest;
import com.gec.backend.safety.entity.SafetyInformationEntity;
import com.gec.backend.safety.repository.SafetyInformationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Agency safety information is owned by the authenticated agency;
 * System Admin may remove but never edit agency-authored content.
 * Only published, non-expired and non-removed safety information is
 * exposed through the public API.
 * Publishing a safety item may create a public notification, while the
 * safety record remains the authoritative source.
 */
@Service
public class SafetyInformationService {

    private final SafetyInformationRepository safetyRepository;
    private final AgencyRepository agencyRepository;
    private final PublicNotificationService notificationService;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public SafetyInformationService(
        SafetyInformationRepository safetyRepository,
        AgencyRepository agencyRepository,
        PublicNotificationService notificationService,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.safetyRepository = safetyRepository;
        this.agencyRepository = agencyRepository;
        this.notificationService = notificationService;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public Map<String, Object> getAdminSummary() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        UUID targetAgencyId = scopeService.isSystemAdmin() ? null : principal.getAgencyId();

        List<SafetyInformationEntity> list = targetAgencyId != null
            ? safetyRepository.findByAgencyId(targetAgencyId)
            : safetyRepository.findAll();

        long total = list.size();
        long published = list.stream().filter(s -> "PUBLISHED".equalsIgnoreCase(s.getStatus()) && s.getRemovedAt() == null).count();
        long drafts = list.stream().filter(s -> "DRAFT".equalsIgnoreCase(s.getStatus()) && s.getRemovedAt() == null).count();
        long archived = list.stream().filter(s -> "ARCHIVED".equalsIgnoreCase(s.getStatus()) || s.getRemovedAt() != null).count();
        long warnings = list.stream().filter(s -> "PUBLISHED".equalsIgnoreCase(s.getStatus()) && ("WARNING".equalsIgnoreCase(s.getSeverity()) || "CRITICAL".equalsIgnoreCase(s.getSeverity())) && s.getRemovedAt() == null).count();

        return Map.of(
            "total", total,
            "published", published,
            "drafts", drafts,
            "archived", archived,
            "warnings", warnings
        );
    }

    public Page<Map<String, Object>> getAdminPosts(String status, String category, String severity, UUID agencyIdParam, String search, Pageable pageable) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        UUID targetAgencyId = scopeService.isSystemAdmin() ? agencyIdParam : principal.getAgencyId();

        List<SafetyInformationEntity> allPosts = targetAgencyId != null
            ? safetyRepository.findByAgencyId(targetAgencyId)
            : safetyRepository.findAll();

        List<Map<String, Object>> filtered = allPosts.stream().filter(s -> {
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status) && !status.equalsIgnoreCase(s.getStatus())) {
                return false;
            }
            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category) && !category.equalsIgnoreCase(s.getCategory())) {
                return false;
            }
            if (severity != null && !severity.isBlank() && !"ALL".equalsIgnoreCase(severity) && !severity.equalsIgnoreCase(s.getSeverity())) {
                return false;
            }
            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase(Locale.US);
                if (!s.getTitle().toLowerCase(Locale.US).contains(q) && !s.getContent().toLowerCase(Locale.US).contains(q)) {
                    return false;
                }
            }
            return true;
        }).map(this::mapToAdminDto)
        .sorted((a, b) -> ((String) b.get("updatedAt")).compareTo((String) a.get("updatedAt")))
        .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        List<Map<String, Object>> pageContent = start <= end ? filtered.subList(start, end) : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    @Transactional
    public Map<String, Object> createPost(CreateSafetyInformationRequest request) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        boolean isSysAdmin = scopeService.isSystemAdmin();

        String sourceType = isSysAdmin ? "SYSTEM" : "AGENCY";
        UUID agencyId = isSysAdmin ? null : principal.getAgencyId();

        String title = request.title().trim();
        String summary = request.summary() != null && !request.summary().isBlank()
            ? request.summary().trim()
            : title;
        String content = request.content().trim();
        String category = request.category() != null && !request.category().isBlank()
            ? request.category().trim().toUpperCase(Locale.US)
            : "GENERAL";
        String severity = request.severity() != null && !request.severity().isBlank()
            ? request.severity().trim().toUpperCase(Locale.US)
            : "INFO";
        String initialStatus = request.status() != null && !request.status().isBlank()
            ? request.status().trim().toUpperCase(Locale.US)
            : "DRAFT";
        boolean notify = Boolean.TRUE.equals(request.notifyUsers());

        UUID postId = UUID.randomUUID();
        SafetyInformationEntity entity = new SafetyInformationEntity(
            postId, sourceType, agencyId, principal.getId(), title, summary, content, category, severity, initialStatus, notify
        );

        if ("PUBLISHED".equals(initialStatus)) {
            entity.setPublishedAt(LocalDateTime.now());
        }

        safetyRepository.save(entity);

        if ("PUBLISHED".equals(initialStatus)) {
            triggerNotificationIfEligible(entity);
        }

        auditService.logAction(
            principal.getId(),
            "SAFETY_INFO_CREATED",
            "SAFETY_INFORMATION",
            postId,
            agencyId,
            "Created " + sourceType + " safety post: " + title,
            null,
            null
        );

        return mapToAdminDto(entity);
    }

    @Transactional
    public Map<String, Object> updatePost(UUID id, CreateSafetyInformationRequest request) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        SafetyInformationEntity entity = safetyRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Safety post not found: " + id));

        // System Admin CANNOT edit Agency posts
        if ("AGENCY".equalsIgnoreCase(entity.getSourceType()) && scopeService.isSystemAdmin()) {
            throw new ResourceConflictException("System Administrators may administratively remove agency posts but cannot modify agency-authored content.");
        }

        if ("AGENCY".equalsIgnoreCase(entity.getSourceType())) {
            scopeService.validateAgencyScope(entity.getAgencyId());
        }

        if (request.title() != null && !request.title().isBlank()) entity.setTitle(request.title().trim());
        if (request.summary() != null && !request.summary().isBlank()) entity.setSummary(request.summary().trim());
        if (request.content() != null && !request.content().isBlank()) entity.setContent(request.content().trim());
        if (request.category() != null && !request.category().isBlank()) entity.setCategory(request.category().trim().toUpperCase(Locale.US));
        if (request.severity() != null && !request.severity().isBlank()) entity.setSeverity(request.severity().trim().toUpperCase(Locale.US));
        if (request.notifyUsers() != null) entity.setNotifyUsers(request.notifyUsers());

        entity.setUpdatedAt(LocalDateTime.now());
        safetyRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "SAFETY_INFO_UPDATED",
            "SAFETY_INFORMATION",
            id,
            entity.getAgencyId(),
            "Updated safety post: " + entity.getTitle(),
            null,
            null
        );

        return mapToAdminDto(entity);
    }

    @Transactional
    public Map<String, Object> publishPost(UUID id) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        SafetyInformationEntity entity = safetyRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Safety post not found: " + id));

        if ("AGENCY".equalsIgnoreCase(entity.getSourceType())) {
            scopeService.validateAgencyScope(entity.getAgencyId());
        } else if (!scopeService.isSystemAdmin()) {
            throw new ResourceConflictException("Access denied.");
        }

        entity.setStatus("PUBLISHED");
        if (entity.getPublishedAt() == null) {
            entity.setPublishedAt(LocalDateTime.now());
        }
        entity.setUpdatedAt(LocalDateTime.now());
        safetyRepository.save(entity);

        triggerNotificationIfEligible(entity);

        auditService.logAction(
            principal.getId(),
            "SAFETY_INFO_PUBLISHED",
            "SAFETY_INFORMATION",
            id,
            entity.getAgencyId(),
            "Published safety post: " + entity.getTitle(),
            null,
            null
        );

        return mapToAdminDto(entity);
    }

    @Transactional
    public Map<String, Object> unpublishPost(UUID id) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        SafetyInformationEntity entity = safetyRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Safety post not found: " + id));

        if ("AGENCY".equalsIgnoreCase(entity.getSourceType())) {
            scopeService.validateAgencyScope(entity.getAgencyId());
        } else if (!scopeService.isSystemAdmin()) {
            throw new ResourceConflictException("Access denied.");
        }

        entity.setStatus("DRAFT");
        entity.setUpdatedAt(LocalDateTime.now());
        safetyRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "SAFETY_INFO_UNPUBLISHED",
            "SAFETY_INFORMATION",
            id,
            entity.getAgencyId(),
            "Unpublished safety post: " + entity.getTitle(),
            null,
            null
        );

        return mapToAdminDto(entity);
    }

    @Transactional
    public Map<String, Object> archivePost(UUID id) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        SafetyInformationEntity entity = safetyRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Safety post not found: " + id));

        if ("AGENCY".equalsIgnoreCase(entity.getSourceType())) {
            scopeService.validateAgencyScope(entity.getAgencyId());
        } else if (!scopeService.isSystemAdmin()) {
            throw new ResourceConflictException("Access denied.");
        }

        entity.setStatus("ARCHIVED");
        entity.setUpdatedAt(LocalDateTime.now());
        safetyRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "SAFETY_INFO_ARCHIVED",
            "SAFETY_INFORMATION",
            id,
            entity.getAgencyId(),
            "Archived safety post: " + entity.getTitle(),
            null,
            null
        );

        return mapToAdminDto(entity);
    }

    @Transactional
    public Map<String, Object> removePostBySystem(UUID id, String removalReason) {
        scopeService.checkSystemAdminAccess();
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();

        if (removalReason == null || removalReason.isBlank()) {
            throw new IllegalArgumentException("A removal reason is required when System Administration removes a safety post.");
        }

        SafetyInformationEntity entity = safetyRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Safety post not found: " + id));

        entity.setRemovedAt(LocalDateTime.now());
        entity.setRemovedBy(principal.getId());
        entity.setRemovalReason(removalReason.trim());
        entity.setStatus("ARCHIVED");
        entity.setUpdatedAt(LocalDateTime.now());
        safetyRepository.save(entity);

        auditService.logAction(
            principal.getId(),
            "SAFETY_INFO_REMOVED_BY_SYSTEM",
            "SAFETY_INFORMATION",
            id,
            entity.getAgencyId(),
            "System Admin removed safety post: " + entity.getTitle() + ". Reason: " + removalReason.trim(),
            null,
            null
        );

        return mapToAdminDto(entity);
    }

    public List<Map<String, Object>> getPublicActivePosts(String category, String severity) {
        List<SafetyInformationEntity> posts = safetyRepository.findActivePublicPosts();

        return posts.stream().filter(s -> {
            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category) && !category.equalsIgnoreCase(s.getCategory())) {
                return false;
            }
            if (severity != null && !severity.isBlank() && !"ALL".equalsIgnoreCase(severity) && !severity.equalsIgnoreCase(s.getSeverity())) {
                return false;
            }
            return true;
        }).map(this::mapToPublicDto).toList();
    }

    public Map<String, Object> getPublicPostById(UUID id) {
        SafetyInformationEntity entity = safetyRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Safety information post not found: " + id));

        if (!"PUBLISHED".equalsIgnoreCase(entity.getStatus()) || entity.getRemovedAt() != null) {
            throw new ResourceNotFoundException("Safety information post not found or no longer available.");
        }

        return mapToPublicDto(entity);
    }

    private void triggerNotificationIfEligible(SafetyInformationEntity entity) {
        if (entity.isNotifyUsers() || "WARNING".equalsIgnoreCase(entity.getSeverity()) || "CRITICAL".equalsIgnoreCase(entity.getSeverity())) {
            String issuingAgencyName = "Ghana Emergency Connect";
            if (entity.getAgencyId() != null) {
                issuingAgencyName = agencyRepository.findById(entity.getAgencyId())
                    .map(a -> a.getName())
                    .orElse("Ghana Emergency Connect");
            }
            notificationService.notifySafetyInformationPublished(entity, issuingAgencyName);
        }
    }

    private Map<String, Object> mapToAdminDto(SafetyInformationEntity entity) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", entity.getId().toString());
        dto.put("sourceType", entity.getSourceType());
        dto.put("agencyId", entity.getAgencyId() != null ? entity.getAgencyId().toString() : null);
        dto.put("createdBy", entity.getCreatedBy().toString());
        dto.put("title", entity.getTitle());
        dto.put("summary", entity.getSummary() != null ? entity.getSummary() : entity.getTitle());
        dto.put("content", entity.getContent());
        dto.put("category", entity.getCategory());
        dto.put("severity", entity.getSeverity());
        dto.put("status", entity.getStatus());
        dto.put("notifyUsers", entity.isNotifyUsers());
        dto.put("publishedAt", entity.getPublishedAt() != null ? entity.getPublishedAt().toString() : null);
        dto.put("expiresAt", entity.getExpiresAt() != null ? entity.getExpiresAt().toString() : null);
        dto.put("removedAt", entity.getRemovedAt() != null ? entity.getRemovedAt().toString() : null);
        dto.put("removedBy", entity.getRemovedBy() != null ? entity.getRemovedBy().toString() : null);
        dto.put("removalReason", entity.getRemovalReason());
        dto.put("createdAt", entity.getCreatedAt().toString());
        dto.put("updatedAt", entity.getUpdatedAt().toString());

        if (entity.getAgencyId() != null) {
            agencyRepository.findById(entity.getAgencyId()).ifPresent(a -> {
                dto.put("agencyName", a.getName());
                dto.put("agencyCode", a.getCode());
            });
        } else {
            dto.put("agencyName", "Ghana Emergency Connect");
            dto.put("agencyCode", "SYSTEM");
        }

        return dto;
    }

    private Map<String, Object> mapToPublicDto(SafetyInformationEntity entity) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", entity.getId().toString());
        dto.put("sourceType", entity.getSourceType());
        dto.put("agencyId", entity.getAgencyId() != null ? entity.getAgencyId().toString() : null);
        dto.put("title", entity.getTitle());
        dto.put("summary", entity.getSummary() != null ? entity.getSummary() : entity.getTitle());
        dto.put("content", entity.getContent());
        dto.put("category", entity.getCategory());
        dto.put("severity", entity.getSeverity());
        dto.put("publishedAt", entity.getPublishedAt() != null ? entity.getPublishedAt().toString() : entity.getCreatedAt().toString());

        if (entity.getAgencyId() != null) {
            agencyRepository.findById(entity.getAgencyId()).ifPresent(a -> {
                dto.put("agencyName", a.getName());
                dto.put("agencyCode", a.getCode());
            });
        } else {
            dto.put("agencyName", "Ghana Emergency Connect");
            dto.put("agencyCode", "SYSTEM");
        }

        return dto;
    }
}
