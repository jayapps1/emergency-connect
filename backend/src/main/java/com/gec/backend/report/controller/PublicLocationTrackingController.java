package com.gec.backend.report.controller;

import com.gec.backend.report.dto.*;
import com.gec.backend.report.service.IncidentLocationTrackingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/location-sessions")
public class PublicLocationTrackingController {

    private final IncidentLocationTrackingService trackingService;

    public PublicLocationTrackingController(IncidentLocationTrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @PostMapping
    public ResponseEntity<LocationSessionResponse> createLocationSession(
        @RequestBody CreateLocationSessionRequest request,
        @RequestHeader(value = "X-Installation-ID", required = false) String installationPublicId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(trackingService.createLocationSession(request, installationPublicId));
    }

    @PostMapping("/{sessionId}/points")
    public ResponseEntity<Void> recordLocationPoint(
        @PathVariable UUID sessionId,
        @Valid @RequestBody LocationPointRequest request
    ) {
        trackingService.recordLocationPoint(sessionId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{sessionId}/stop")
    public ResponseEntity<LocationSessionResponse> stopLocationSession(
        @PathVariable UUID sessionId,
        @RequestParam(required = false) String reason
    ) {
        return ResponseEntity.ok(trackingService.stopLocationSession(sessionId, reason));
    }
}
