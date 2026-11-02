package com.gec.backend.report.controller;

import com.gec.backend.report.dto.*;
import com.gec.backend.report.service.ResponseTrackingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
public class ResponseTrackingController {

    private final ResponseTrackingService responseTrackingService;

    public ResponseTrackingController(ResponseTrackingService responseTrackingService) {
        this.responseTrackingService = responseTrackingService;
    }

    @PostMapping("/api/v1/staff/response-invitations")
    public ResponseEntity<ResponseInvitationResponseDto> createResponseInvitation(@Valid @RequestBody CreateResponseInvitationDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(responseTrackingService.createResponseInvitation(dto));
    }

    @PostMapping("/api/v1/agency/response-invitations/accept")
    public ResponseEntity<ResponseTrackingSessionResponseDto> acceptResponseInvitation(@RequestParam String token) {
        return ResponseEntity.ok(responseTrackingService.acceptResponseInvitation(token));
    }

    @PostMapping("/api/v1/agency/response-tracking/{sessionId}/points")
    public ResponseEntity<Void> recordResponseLocationPoint(
        @PathVariable UUID sessionId,
        @Valid @RequestBody LocationPointRequest request
    ) {
        responseTrackingService.recordResponseLocationPoint(sessionId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/agency/response-tracking/{sessionId}/stop")
    public ResponseEntity<ResponseTrackingSessionResponseDto> stopResponseTracking(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(responseTrackingService.stopResponseTracking(sessionId));
    }

    @GetMapping("/api/v1/staff/response-tracking/assignments/{reportAssignmentId}")
    public ResponseEntity<ResponseTrackingSessionResponseDto> getActiveResponseSession(@PathVariable UUID reportAssignmentId) {
        return ResponseEntity.ok(responseTrackingService.getActiveResponseSession(reportAssignmentId));
    }
}
