package com.gec.backend.report.controller;

import com.gec.backend.report.dto.*;
import com.gec.backend.report.service.IncidentTrackingShareService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class PublicTrackShareController {

    private final IncidentTrackingShareService shareService;

    public PublicTrackShareController(IncidentTrackingShareService shareService) {
        this.shareService = shareService;
    }

    @GetMapping("/api/v1/public/track-share/{token}")
    public ResponseEntity<PublicTrackingShareDetailResponseDto> getPublicShareByToken(@PathVariable String token) {
        return ResponseEntity.ok(shareService.getPublicShareByToken(token));
    }

    @PostMapping("/api/v1/staff/tracking-shares")
    public ResponseEntity<TrackingShareResponseDto> createTrackingShare(@Valid @RequestBody CreateTrackingShareRequestDto requestDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shareService.createTrackingShare(requestDto));
    }

    @GetMapping("/api/v1/staff/tracking-shares/reports/{reportId}")
    public ResponseEntity<List<TrackingShareResponseDto>> getSharesForReport(@PathVariable UUID reportId) {
        return ResponseEntity.ok(shareService.getSharesForReport(reportId));
    }

    @PostMapping("/api/v1/staff/tracking-shares/{shareId}/revoke")
    public ResponseEntity<TrackingShareResponseDto> revokeTrackingShare(@PathVariable UUID shareId) {
        return ResponseEntity.ok(shareService.revokeTrackingShare(shareId));
    }
}
