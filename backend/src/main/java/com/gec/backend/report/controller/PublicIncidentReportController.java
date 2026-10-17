package com.gec.backend.report.controller;

import com.gec.backend.report.dto.IncidentReportRequest;
import com.gec.backend.report.dto.IncidentReportResponse;
import com.gec.backend.report.dto.ReportAttachmentResponseDto;
import com.gec.backend.report.dto.TrackedReportResponse;
import com.gec.backend.report.service.IncidentReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/reports")
public class PublicIncidentReportController {

    private final IncidentReportService reportService;

    public PublicIncidentReportController(IncidentReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping
    public ResponseEntity<IncidentReportResponse> submitReport(@Valid @RequestBody IncidentReportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reportService.submitReport(request));
    }

    @PostMapping(value = "/{reportId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportAttachmentResponseDto> addAttachment(
        @PathVariable UUID reportId,
        @RequestHeader(value = "X-Report-Token", required = false) String token,
        @RequestParam("mediaType") String mediaType,
        @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reportService.addReportAttachment(reportId, token, mediaType, file));
    }

    @GetMapping("/track/{publicReference}")
    public ResponseEntity<TrackedReportResponse> trackReport(
        @PathVariable String publicReference,
        @RequestHeader("X-Report-Token") String token
    ) {
        return ResponseEntity.ok(reportService.trackReport(publicReference, token));
    }
}
