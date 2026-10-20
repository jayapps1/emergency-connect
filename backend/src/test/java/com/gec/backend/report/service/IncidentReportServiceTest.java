package com.gec.backend.report.service;

import com.gec.backend.abuse.service.ReportRiskEvaluationService;
import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.publicuser.repository.AppInstallationRepository;
import com.gec.backend.report.dto.*;
import com.gec.backend.report.entity.*;
import com.gec.backend.report.repository.*;
import com.gec.backend.station.repository.StationRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

class IncidentReportServiceTest {

    private final IncidentCategoryRepository categoryRepository = Mockito.mock(IncidentCategoryRepository.class);
    private final IncidentReportRepository reportRepository = Mockito.mock(IncidentReportRepository.class);
    private final ReportAssignmentRepository assignmentRepository = Mockito.mock(ReportAssignmentRepository.class);
    private final ReportStatusHistoryRepository historyRepository = Mockito.mock(ReportStatusHistoryRepository.class);
    private final ReportAttachmentRepository attachmentRepository = Mockito.mock(ReportAttachmentRepository.class);
    private final ReportAttachmentStorageService attachmentStorageService = Mockito.mock(ReportAttachmentStorageService.class);
    private final AgencyRepository agencyRepository = Mockito.mock(AgencyRepository.class);
    private final StationRepository stationRepository = Mockito.mock(StationRepository.class);
    private final AppInstallationRepository installationRepository = Mockito.mock(AppInstallationRepository.class);
    private final ReportRiskEvaluationService riskEvaluationService = Mockito.mock(ReportRiskEvaluationService.class);
    private final IncidentResponseReviewRepository reviewRepository = Mockito.mock(IncidentResponseReviewRepository.class);

    private final IncidentReportService reportService = new IncidentReportService(
        categoryRepository,
        reportRepository,
        assignmentRepository,
        historyRepository,
        attachmentRepository,
        attachmentStorageService,
        agencyRepository,
        stationRepository,
        installationRepository,
        riskEvaluationService,
        reviewRepository
    );

    @Test
    void submitReport_createsReportAndAssignments() {
        UUID categoryId = UUID.randomUUID();
        IncidentCategoryEntity category = new IncidentCategoryEntity(
            categoryId, "FIRE", "Fire Incident", "Fire emergency", IncidentSeverity.HIGH,
            true, false, true, 1, true, Set.of(AgencyType.FIRE, AgencyType.AMBULANCE)
        );

        given(categoryRepository.findByIdAndActiveTrue(categoryId)).willReturn(Optional.of(category));

        IncidentReportRequest request = new IncidentReportRequest(
            categoryId, ReportMode.SILENT, "Fire at building", "session_123", UUID.randomUUID(), null, null
        );

        IncidentReportResponse response = reportService.submitReport(request);

        assertNotNull(response);
        assertNotNull(response.publicReference());
        assertTrue(response.publicReference().startsWith("RPT-"));
        assertNotNull(response.trackingToken());
        assertEquals(2, response.targetAgencyTypes().size());
        assertTrue(response.targetAgencyTypes().contains(AgencyType.FIRE));
        assertTrue(response.targetAgencyTypes().contains(AgencyType.AMBULANCE));
    }

    @Test
    void trackReport_throwsException_whenTokenIsInvalid() {
        String publicRef = "RPT-20261014-ABC123";
        IncidentReportEntity report = new IncidentReportEntity();
        report.setPublicReference(publicRef);
        report.setTrackingTokenHash("some_other_hash");

        given(reportRepository.findByPublicReference(publicRef)).willReturn(Optional.of(report));

        assertThrows(IllegalArgumentException.class, () -> {
            reportService.trackReport(publicRef, "invalid_raw_token");
        });
    }
}
