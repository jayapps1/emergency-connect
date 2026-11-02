package com.gec.backend.report.controller;

import com.gec.backend.report.dto.*;
import com.gec.backend.report.service.LiveTrackingRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class LiveTrackingRequestController {

    private final LiveTrackingRequestService requestService;

    public LiveTrackingRequestController(LiveTrackingRequestService requestService) {
        this.requestService = requestService;
    }

    @PostMapping("/api/v1/staff/live-tracking-requests")
    public ResponseEntity<LiveTrackingRequestResponseDto> requestLiveTracking(@Valid @RequestBody CreateLiveTrackingRequestDto requestDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.requestLiveTracking(requestDto));
    }

    @GetMapping("/api/v1/staff/live-tracking-requests/reports/{reportId}")
    public ResponseEntity<List<LiveTrackingRequestResponseDto>> getRequestsForReport(@PathVariable UUID reportId) {
        return ResponseEntity.ok(requestService.getRequestsForReport(reportId));
    }

    @PostMapping("/api/v1/public/live-tracking-requests/{requestId}/respond")
    public ResponseEntity<LiveTrackingRequestResponseDto> respondToLiveTrackingRequest(
        @PathVariable UUID requestId,
        @RequestParam String action
    ) {
        return ResponseEntity.ok(requestService.respondToLiveTrackingRequest(requestId, action));
    }
}
