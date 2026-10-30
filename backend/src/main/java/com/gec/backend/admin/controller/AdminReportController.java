package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.service.AdminReportWorkflowService;
import com.gec.backend.admin.service.ResponderAssignmentService;
import com.gec.backend.report.dto.ReportAttachmentResponseDto;
import com.gec.backend.report.service.IncidentReportService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/reports")
public class AdminReportController {

    private final AdminReportWorkflowService reportWorkflowService;
    private final IncidentReportService reportService;
    private final ResponderAssignmentService responderAssignmentService;

    public AdminReportController(
        AdminReportWorkflowService reportWorkflowService,
        IncidentReportService reportService,
        ResponderAssignmentService responderAssignmentService
    ) {
        this.reportWorkflowService = reportWorkflowService;
        this.reportService = reportService;
        this.responderAssignmentService = responderAssignmentService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Page<AdminReportSummaryResponse>> getReports(Pageable pageable) {
        return ResponseEntity.ok(reportWorkflowService.getReports(pageable));
    }

    @GetMapping("/{reportId}")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<AdminReportDetailsResponse> getReportDetails(@PathVariable UUID reportId) {
        return ResponseEntity.ok(reportWorkflowService.getReportDetails(reportId));
    }

    @GetMapping("/{reportId}/attachments")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<List<ReportAttachmentResponseDto>> getReportAttachments(@PathVariable UUID reportId) {
        return ResponseEntity.ok(reportService.getReportAttachments(reportId));
    }

    @GetMapping("/{reportId}/attachments/{attachmentId}")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Resource> streamReportAttachment(
        @PathVariable UUID reportId,
        @PathVariable UUID attachmentId
    ) {
        Resource resource = reportService.getAttachmentResource(attachmentId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
            .body(resource);
    }

    @PostMapping("/{reportId}/acknowledge")
    @PreAuthorize("hasAuthority('REPORT_ACKNOWLEDGE')")
    public ResponseEntity<AdminReportDetailsResponse> acknowledgeReport(@PathVariable UUID reportId) {
        return ResponseEntity.ok(reportWorkflowService.acknowledgeReport(reportId));
    }

    @PostMapping("/{reportId}/assign")
    @PreAuthorize("hasAuthority('REPORT_ASSIGN')")
    public ResponseEntity<AdminReportDetailsResponse> assignReport(
        @PathVariable UUID reportId,
        @Valid @RequestBody ReportAssignmentRequest request
    ) {
        return ResponseEntity.ok(reportWorkflowService.assignReport(reportId, request));
    }

    @PatchMapping("/{reportId}/status")
    @PreAuthorize("hasAuthority('REPORT_UPDATE_STATUS')")
    public ResponseEntity<AdminReportDetailsResponse> updateReportStatus(
        @PathVariable UUID reportId,
        @Valid @RequestBody ReportStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(reportWorkflowService.updateReportStatus(reportId, request));
    }

    @PostMapping("/{reportId}/transfer")
    @PreAuthorize("hasAuthority('REPORT_TRANSFER')")
    public ResponseEntity<AdminReportDetailsResponse> transferReport(
        @PathVariable UUID reportId,
        @Valid @RequestBody ReportTransferRequest request
    ) {
        return ResponseEntity.ok(reportWorkflowService.transferReport(reportId, request));
    }

    @PostMapping("/{reportId}/prompt")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<AdminReportDetailsResponse> promptAgency(
        @PathVariable UUID reportId,
        @RequestBody(required = false) Map<String, String> body
    ) {
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(reportWorkflowService.promptAgency(reportId, note));
    }

    @GetMapping("/{reportId}/eligible-responders")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<List<EligibleResponderResponseDto>> getEligibleResponders(@PathVariable UUID reportId) {
        return ResponseEntity.ok(responderAssignmentService.getEligibleResponders(reportId));
    }

    @GetMapping("/{reportId}/responders")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<List<ResponderAssignmentResponseDto>> getAssignedResponders(@PathVariable UUID reportId) {
        return ResponseEntity.ok(responderAssignmentService.getAssignedResponders(reportId));
    }

    @PostMapping("/{reportId}/responders")
    @PreAuthorize("hasAuthority('REPORT_ASSIGN')")
    public ResponseEntity<ResponderAssignmentResponseDto> assignResponder(
        @PathVariable UUID reportId,
        @Valid @RequestBody AssignResponderRequest request
    ) {
        return ResponseEntity.ok(responderAssignmentService.assignResponder(reportId, request));
    }

    @DeleteMapping("/{reportId}/responders/{assignmentId}")
    @PreAuthorize("hasAuthority('REPORT_ASSIGN')")
    public ResponseEntity<Void> releaseResponder(
        @PathVariable UUID reportId,
        @PathVariable UUID assignmentId
    ) {
        responderAssignmentService.releaseResponder(reportId, assignmentId);
        return ResponseEntity.noContent().build();
    }
}
