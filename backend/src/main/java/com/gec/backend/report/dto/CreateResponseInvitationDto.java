package com.gec.backend.report.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateResponseInvitationDto(
    @NotNull UUID reportAssignmentId,
    @NotNull UUID responseLeadStaffUserId,
    UUID assignedApplianceId,
    Integer durationMinutes
) {}
