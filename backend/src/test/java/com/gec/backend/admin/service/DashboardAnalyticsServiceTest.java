package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.DashboardSummaryResponse;
import com.gec.backend.admin.dto.EmergencyActivityPoint;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.report.repository.IncidentReportRepository;
import com.gec.backend.report.repository.ReportAssignmentRepository;
import com.gec.backend.station.repository.StationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.BDDMockito.given;

class DashboardAnalyticsServiceTest {

    private final AgencyRepository agencyRepository = Mockito.mock(AgencyRepository.class);
    private final StationRepository stationRepository = Mockito.mock(StationRepository.class);
    private final IncidentReportRepository reportRepository = Mockito.mock(IncidentReportRepository.class);
    private final ReportAssignmentRepository assignmentRepository = Mockito.mock(ReportAssignmentRepository.class);
    private final AdminScopeService scopeService = Mockito.mock(AdminScopeService.class);

    private final DashboardAnalyticsService analyticsService = new DashboardAnalyticsService(
        agencyRepository, stationRepository, reportRepository, assignmentRepository, scopeService
    );

    @BeforeEach
    void setUp() {
        given(scopeService.isSystemAdmin()).willReturn(true);
    }

    @Test
    void getSummary_returnsAggregatedCounts() {
        given(agencyRepository.count()).willReturn(4L);
        given(stationRepository.count()).willReturn(18L);
        given(reportRepository.findAll()).willReturn(List.of());

        DashboardSummaryResponse summary = analyticsService.getSummary();

        assertNotNull(summary);
        assertEquals(4L, summary.totalAgencies());
        assertEquals(18L, summary.activeStations());
        assertEquals(0L, summary.reportsToday());
    }

    @Test
    void getActivity_returnsFormattedPointsForPeriod() {
        given(reportRepository.findAll()).willReturn(List.of());

        List<EmergencyActivityPoint> points7D = analyticsService.getActivity("7D");

        assertNotNull(points7D);
        assertEquals(7, points7D.size());
    }
}
