package com.gec.backend.admin.service;

import com.gec.backend.messaging.service.StaffNotificationService;
import com.gec.backend.report.entity.IncidentReportEntity;
import com.gec.backend.report.entity.ReportAssignmentEntity;
import com.gec.backend.report.entity.ReportStatus;
import com.gec.backend.report.repository.IncidentReportRepository;
import com.gec.backend.report.repository.ReportAssignmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * SLA timing is independent of workflow status and never changes
 * assignment ownership or operational state automatically.
 * Escalation notifications are emitted only when an assignment crosses
 * a timing threshold to prevent duplicate alerts on every scheduler run.
 */
@Component
public class IncidentSlaMonitor {

    private static final Logger log = LoggerFactory.getLogger(IncidentSlaMonitor.class);

    private final ReportAssignmentRepository assignmentRepository;
    private final IncidentReportRepository reportRepository;
    private final StaffNotificationService staffNotificationService;

    @Value("${app.operations.sla.acknowledgement.attention-minutes:3}")
    private long ackAttentionMinutes;

    @Value("${app.operations.sla.acknowledgement.delayed-minutes:5}")
    private long ackDelayedMinutes;

    @Value("${app.operations.sla.response-start.attention-minutes:7}")
    private long respAttentionMinutes;

    @Value("${app.operations.sla.response-start.delayed-minutes:10}")
    private long respDelayedMinutes;

    public IncidentSlaMonitor(
        ReportAssignmentRepository assignmentRepository,
        IncidentReportRepository reportRepository,
        StaffNotificationService staffNotificationService
    ) {
        this.assignmentRepository = assignmentRepository;
        this.reportRepository = reportRepository;
        this.staffNotificationService = staffNotificationService;
    }

    @Scheduled(fixedDelayString = "${app.operations.sla.scheduler.interval-seconds:60}000")
    @Transactional
    public void monitorIncidentSla() {
        List<ReportAssignmentEntity> activeAssignments = assignmentRepository.findByStatusIn(
            List.of(ReportStatus.SUBMITTED, ReportStatus.ASSIGNED, ReportStatus.ACKNOWLEDGED)
        );

        if (activeAssignments.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now();

        for (ReportAssignmentEntity assignment : activeAssignments) {
            try {
                processAssignmentSla(assignment, now);
            } catch (Exception e) {
                log.error("Failed to evaluate SLA for assignment {}", assignment.getId(), e);
            }
        }
    }

    private void processAssignmentSla(ReportAssignmentEntity assignment, LocalDateTime now) {
        ReportStatus status = assignment.getStatus();

        // 1. Acknowledgement SLA evaluation (for SUBMITTED/ASSIGNED)
        if (status == ReportStatus.SUBMITTED || status == ReportStatus.ASSIGNED) {
            LocalDateTime start = assignment.getAssignedAt() != null ? assignment.getAssignedAt() : assignment.getCreatedAt();
            long elapsedMinutes = Duration.between(start, now).toMinutes();

            String newAckSla = "ON_TIME";
            if (elapsedMinutes >= ackDelayedMinutes) {
                newAckSla = "DELAYED";
            } else if (elapsedMinutes >= ackAttentionMinutes) {
                newAckSla = "ATTENTION";
            }

            String prevAckSla = assignment.getAcknowledgementSlaState();
            if (!newAckSla.equals(prevAckSla)) {
                assignment.setAcknowledgementSlaState(newAckSla);
                assignment.setUpdatedAt(now);
                assignmentRepository.save(assignment);

                if ("DELAYED".equals(newAckSla)) {
                    assignment.setLastEscalatedAt(now);
                    assignmentRepository.save(assignment);

                    reportRepository.findById(assignment.getReportId()).ifPresent(report -> {
                        staffNotificationService.notifyStationStaff(
                            assignment.getAgencyId(),
                            assignment.getStationId(),
                            report.getId(),
                            assignment.getId(),
                            "INCIDENT_ACK_DELAYED",
                            "Incident Acknowledgement Delayed",
                            "Report " + report.getPublicReference() + " has exceeded target acknowledgement time (" + elapsedMinutes + " min elapsed)."
                        );
                    });
                }
            }
        }

        // 2. Response Start SLA evaluation (for ACKNOWLEDGED)
        if (status == ReportStatus.ACKNOWLEDGED) {
            LocalDateTime start = assignment.getUpdatedAt() != null ? assignment.getUpdatedAt() : assignment.getCreatedAt();
            long elapsedMinutes = Duration.between(start, now).toMinutes();

            String newRespSla = "ON_TIME";
            if (elapsedMinutes >= respDelayedMinutes) {
                newRespSla = "DELAYED";
            } else if (elapsedMinutes >= respAttentionMinutes) {
                newRespSla = "ATTENTION";
            }

            String prevRespSla = assignment.getResponseStartSlaState();
            if (!newRespSla.equals(prevRespSla)) {
                assignment.setResponseStartSlaState(newRespSla);
                assignment.setUpdatedAt(now);
                assignmentRepository.save(assignment);

                if ("DELAYED".equals(newRespSla)) {
                    assignment.setLastEscalatedAt(now);
                    assignmentRepository.save(assignment);

                    reportRepository.findById(assignment.getReportId()).ifPresent(report -> {
                        staffNotificationService.notifyStationStaff(
                            assignment.getAgencyId(),
                            assignment.getStationId(),
                            report.getId(),
                            assignment.getId(),
                            "INCIDENT_RESPONSE_START_DELAYED",
                            "Incident Response Start Delayed",
                            "Report " + report.getPublicReference() + " is acknowledged but response start is delayed (" + elapsedMinutes + " min elapsed)."
                        );
                    });
                }
            }
        }
    }
}
