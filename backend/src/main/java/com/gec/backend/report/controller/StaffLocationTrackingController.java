package com.gec.backend.report.controller;

import com.gec.backend.report.dto.IncidentLocationSummaryResponse;
import com.gec.backend.report.dto.LocationSessionResponse;
import com.gec.backend.report.service.IncidentLocationTrackingService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff")
public class StaffLocationTrackingController {

    private final IncidentLocationTrackingService trackingService;

    public StaffLocationTrackingController(IncidentLocationTrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @GetMapping("/incidents/{reportId}/location-summary")
    public ResponseEntity<IncidentLocationSummaryResponse> getIncidentLocationSummary(@PathVariable UUID reportId) {
        return ResponseEntity.ok(trackingService.getIncidentLocationSummary(reportId));
    }

    @GetMapping("/location-sessions")
    public ResponseEntity<Page<LocationSessionResponse>> getStaffLocationSessions(Pageable pageable) {
        return ResponseEntity.ok(trackingService.getStaffLocationSessions(pageable));
    }

    @PostMapping("/location-sessions/{sessionId}/revoke")
    public ResponseEntity<LocationSessionResponse> revokeLocationSession(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(trackingService.revokeLocationSession(sessionId));
    }
}
