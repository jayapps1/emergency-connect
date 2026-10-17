package com.gec.backend.report.dto;

import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.report.entity.IncidentSeverity;
import java.util.Set;
import java.util.UUID;

public record IncidentCategoryResponse(
    UUID id,
    String code,
    String name,
    String description,
    IncidentSeverity defaultSeverity,
    boolean supportsSilent,
    boolean supportsGeneral,
    boolean supportsCall,
    int displayOrder,
    boolean active,
    Set<AgencyType> defaultAgencyTypes
) {}
