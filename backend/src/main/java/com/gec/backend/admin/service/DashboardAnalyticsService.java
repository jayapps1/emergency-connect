package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.DashboardSummaryResponse;
import com.gec.backend.admin.dto.EmergencyActivityPoint;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.report.entity.IncidentReportEntity;
import com.gec.backend.report.entity.IncidentSeverity;
import com.gec.backend.report.entity.ReportAssignmentEntity;
import com.gec.backend.report.entity.ReportStatus;
import com.gec.backend.report.repository.IncidentReportRepository;
import com.gec.backend.report.repository.ReportAssignmentRepository;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardAnalyticsService {

    private final AgencyRepository agencyRepository;
    private final StationRepository stationRepository;
    private final IncidentReportRepository reportRepository;
    private final ReportAssignmentRepository assignmentRepository;
    private final AdminScopeService scopeService;

    public DashboardAnalyticsService(
        AgencyRepository agencyRepository,
        StationRepository stationRepository,
        IncidentReportRepository reportRepository,
        ReportAssignmentRepository assignmentRepository,
        AdminScopeService scopeService
    ) {
        this.agencyRepository = agencyRepository;
        this.stationRepository = stationRepository;
        this.reportRepository = reportRepository;
        this.assignmentRepository = assignmentRepository;
        this.scopeService = scopeService;
    }

    public DashboardSummaryResponse getSummary() {
        long totalAgencies = scopeService.isSystemAdmin() ? agencyRepository.count() : 1L;
        long activeStations;
        List<IncidentReportEntity> scopedReports;

        if (scopeService.isSystemAdmin()) {
            activeStations = stationRepository.count();
            scopedReports = reportRepository.findAll();
        } else {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            if (agencyId == null) {
                return new DashboardSummaryResponse(0, 0, 0, 0, 0, 0);
            }
            activeStations = stationRepository.findByAgencyId(agencyId).size();

            AgencyEntity agency = agencyRepository.findById(agencyId).orElse(null);
            if (agency == null) {
                scopedReports = List.of();
            } else {
                Set<UUID> reportIds = assignmentRepository.findByAgencyType(agency.getType())
                    .stream()
                    .map(ReportAssignmentEntity::getReportId)
                    .collect(Collectors.toSet());
                scopedReports = reportIds.isEmpty() ? List.of() : reportRepository.findAllById(reportIds);
            }
        }

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        long reportsToday = scopedReports.stream().filter(r -> r.getCreatedAt().isAfter(startOfToday)).count();
        long openIncidents = scopedReports.stream().filter(r -> r.getStatus() != ReportStatus.CLOSED && r.getStatus() != ReportStatus.RESOLVED && r.getStatus() != ReportStatus.REJECTED).count();
        long criticalIncidents = scopedReports.stream().filter(r -> r.getSeverity() == IncidentSeverity.CRITICAL && r.getStatus() != ReportStatus.CLOSED).count();
        long unacknowledged = scopedReports.stream().filter(r -> r.getStatus() == ReportStatus.SUBMITTED).count();

        return new DashboardSummaryResponse(
            totalAgencies,
            activeStations,
            reportsToday,
            openIncidents,
            criticalIncidents,
            unacknowledged
        );
    }

    public List<EmergencyActivityPoint> getActivity(String period) {
        List<IncidentReportEntity> reports;
        if (scopeService.isSystemAdmin()) {
            reports = reportRepository.findAll();
        } else {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            AgencyEntity agency = agencyId != null ? agencyRepository.findById(agencyId).orElse(null) : null;
            if (agency == null) {
                reports = List.of();
            } else {
                Set<UUID> reportIds = assignmentRepository.findByAgencyType(agency.getType())
                    .stream()
                    .map(ReportAssignmentEntity::getReportId)
                    .collect(Collectors.toSet());
                reports = reportIds.isEmpty() ? List.of() : reportRepository.findAllById(reportIds);
            }
        }

        List<EmergencyActivityPoint> points = new ArrayList<>();

        if ("24H".equalsIgnoreCase(period)) {
            LocalDateTime now = LocalDateTime.now();
            for (int i = 23; i >= 0; i--) {
                LocalDateTime hourStart = now.minusHours(i).withMinute(0).withSecond(0);
                LocalDateTime hourEnd = hourStart.plusHours(1);
                long count = reports.stream().filter(r -> !r.getCreatedAt().isBefore(hourStart) && r.getCreatedAt().isBefore(hourEnd)).count();
                points.add(new EmergencyActivityPoint(hourStart.format(DateTimeFormatter.ofPattern("HH:00")), count));
            }
        } else if ("7D".equalsIgnoreCase(period)) {
            LocalDate today = LocalDate.now();
            for (int i = 6; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                long count = reports.stream().filter(r -> r.getCreatedAt().toLocalDate().equals(date)).count();
                points.add(new EmergencyActivityPoint(date.format(DateTimeFormatter.ofPattern("EEE")), count));
            }
        } else if ("30D".equalsIgnoreCase(period)) {
            LocalDate today = LocalDate.now();
            for (int i = 29; i >= 0; i -= 5) {
                LocalDate date = today.minusDays(i);
                long count = reports.stream().filter(r -> !r.getCreatedAt().toLocalDate().isBefore(date.minusDays(4)) && !r.getCreatedAt().toLocalDate().isAfter(date)).count();
                points.add(new EmergencyActivityPoint(date.format(DateTimeFormatter.ofPattern("dd MMM")), count));
            }
        } else {
            LocalDate today = LocalDate.now();
            for (int i = 11; i >= 0; i--) {
                LocalDate month = today.minusMonths(i);
                long count = reports.stream().filter(r -> r.getCreatedAt().getMonth() == month.getMonth() && r.getCreatedAt().getYear() == month.getYear()).count();
                points.add(new EmergencyActivityPoint(month.format(DateTimeFormatter.ofPattern("MMM")), count));
            }
        }

        return points;
    }
}
