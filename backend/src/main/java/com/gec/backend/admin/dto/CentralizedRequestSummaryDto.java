package com.gec.backend.admin.dto;

import java.util.List;

public record CentralizedRequestSummaryDto(
    List<CentralizedRequestItemDto> allRequests,
    List<AdminAccessRequestResponse> agencyAccessRequests,
    List<UserManagementRequestResponse> emailChangeRequests,
    List<UserManagementRequestResponse> mfaRecoveryRequests,
    long totalPendingCount,
    long agencyAccessPendingCount,
    long emailChangePendingCount,
    long mfaRecoveryPendingCount
) {}
