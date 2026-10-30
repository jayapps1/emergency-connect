package com.gec.backend.report.controller;

import com.gec.backend.report.dto.ConvertCallAttemptToIncidentRequest;
import com.gec.backend.report.dto.EmergencyCallAttemptResponse;
import com.gec.backend.report.service.EmergencyCallAttemptService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff/emergency-call-attempts")
public class StaffEmergencyCallAttemptController {

    private final EmergencyCallAttemptService callAttemptService;

    public StaffEmergencyCallAttemptController(EmergencyCallAttemptService callAttemptService) {
        this.callAttemptService = callAttemptService;
    }

    @GetMapping
    public ResponseEntity<Page<EmergencyCallAttemptResponse>> getStaffCallAttempts(Pageable pageable) {
        return ResponseEntity.ok(callAttemptService.getStaffCallAttempts(pageable));
    }

    @GetMapping("/{callAttemptId}")
    public ResponseEntity<EmergencyCallAttemptResponse> getStaffCallAttemptDetails(@PathVariable UUID callAttemptId) {
        return ResponseEntity.ok(callAttemptService.getStaffCallAttemptDetails(callAttemptId));
    }

    @PatchMapping("/{callAttemptId}/status")
    public ResponseEntity<EmergencyCallAttemptResponse> updateCallAttemptStatus(
        @PathVariable UUID callAttemptId,
        @RequestParam String status
    ) {
        return ResponseEntity.ok(callAttemptService.updateCallAttemptStatus(callAttemptId, status));
    }

    @PostMapping("/{callAttemptId}/convert-to-incident")
    public ResponseEntity<EmergencyCallAttemptResponse> convertCallAttemptToIncident(
        @PathVariable UUID callAttemptId,
        @Valid @RequestBody ConvertCallAttemptToIncidentRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(callAttemptService.convertCallAttemptToIncident(callAttemptId, request));
    }
}
