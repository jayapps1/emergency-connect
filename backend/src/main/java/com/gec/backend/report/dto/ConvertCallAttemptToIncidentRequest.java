package com.gec.backend.report.dto;

import com.gec.backend.report.entity.ReportMode;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ConvertCallAttemptToIncidentRequest(
    @NotNull UUID categoryId,
    @NotNull ReportMode reportMode,
    String description,
    VehicleInfoDto vehicleInfo
) {}
