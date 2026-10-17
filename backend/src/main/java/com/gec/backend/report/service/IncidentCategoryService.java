package com.gec.backend.report.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.report.dto.CreateCategoryRequest;
import com.gec.backend.report.dto.IncidentCategoryResponse;
import com.gec.backend.report.dto.UpdateCategoryRequest;
import com.gec.backend.report.entity.IncidentCategoryEntity;
import com.gec.backend.report.repository.IncidentCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class IncidentCategoryService {

    private final IncidentCategoryRepository categoryRepository;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public IncidentCategoryService(
        IncidentCategoryRepository categoryRepository,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.categoryRepository = categoryRepository;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    public List<IncidentCategoryResponse> getAllCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAscNameAsc().stream().map(this::mapToResponse).toList();
    }

    public IncidentCategoryResponse getCategoryById(UUID id) {
        IncidentCategoryEntity entity = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident category not found: " + id));
        return mapToResponse(entity);
    }

    @Transactional
    public IncidentCategoryResponse createCategory(CreateCategoryRequest request) {
        if (request.supportsSilent() == request.supportsGeneral()) {
            throw new IllegalArgumentException("Incident category report mode must be exclusively Silent or General, not both.");
        }

        if (categoryRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new IllegalArgumentException("Incident category code already exists: " + request.code());
        }

        UUID id = UUID.randomUUID();
        IncidentCategoryEntity entity = new IncidentCategoryEntity(
            id,
            request.code().trim().toUpperCase(),
            request.name(),
            request.description(),
            request.defaultSeverity(),
            request.supportsSilent(),
            request.supportsGeneral(),
            request.supportsCall(),
            request.displayOrder(),
            true,
            request.defaultAgencyTypes() != null ? request.defaultAgencyTypes() : Set.of()
        );
        categoryRepository.save(entity);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "INCIDENT_CATEGORY_CREATED", "INCIDENT_CATEGORY", id, null, "Created category " + entity.getName(), null, null);

        return mapToResponse(entity);
    }

    @Transactional
    public IncidentCategoryResponse updateCategory(UUID id, UpdateCategoryRequest request) {
        if (request.supportsSilent() == request.supportsGeneral()) {
            throw new IllegalArgumentException("Incident category report mode must be exclusively Silent or General, not both.");
        }

        IncidentCategoryEntity entity = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident category not found: " + id));

        entity.setName(request.name());
        entity.setDescription(request.description());
        entity.setDefaultSeverity(request.defaultSeverity());
        entity.setSupportsSilent(request.supportsSilent());
        entity.setSupportsGeneral(request.supportsGeneral());
        entity.setSupportsCall(request.supportsCall());
        entity.setDisplayOrder(request.displayOrder());
        entity.setActive(request.active());
        if (request.defaultAgencyTypes() != null) {
            entity.setDefaultAgencyTypes(request.defaultAgencyTypes());
        }
        entity.setUpdatedAt(LocalDateTime.now());

        categoryRepository.save(entity);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "INCIDENT_CATEGORY_UPDATED", "INCIDENT_CATEGORY", id, null, "Updated category " + entity.getName(), null, null);

        return mapToResponse(entity);
    }

    @Transactional
    public IncidentCategoryResponse toggleCategoryStatus(UUID id) {
        IncidentCategoryEntity entity = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Incident category not found: " + id));

        entity.setActive(!entity.isActive());
        entity.setUpdatedAt(LocalDateTime.now());
        categoryRepository.save(entity);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "INCIDENT_CATEGORY_STATUS_TOGGLED", "INCIDENT_CATEGORY", id, null, "Toggled category active status to " + entity.isActive() + " for " + entity.getName(), null, null);

        return mapToResponse(entity);
    }

    public IncidentCategoryResponse mapToResponse(IncidentCategoryEntity entity) {
        return new IncidentCategoryResponse(
            entity.getId(),
            entity.getCode(),
            entity.getName(),
            entity.getDescription(),
            entity.getDefaultSeverity(),
            entity.isSupportsSilent(),
            entity.isSupportsGeneral(),
            entity.isSupportsCall(),
            entity.getDisplayOrder(),
            entity.isActive(),
            entity.getDefaultAgencyTypes() != null ? entity.getDefaultAgencyTypes() : Set.of()
        );
    }
}
