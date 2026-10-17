package com.gec.backend.report.dto;

import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.report.entity.IncidentSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record UpdateCategoryRequest(
    @NotBlank String name,
    String description,
    @NotNull IncidentSeverity defaultSeverity,
    boolean supportsSilent,
    boolean supportsGeneral,
    boolean supportsCall,
    int displayOrder,
    boolean active,
    Set<AgencyType> defaultAgencyTypes
) {}
