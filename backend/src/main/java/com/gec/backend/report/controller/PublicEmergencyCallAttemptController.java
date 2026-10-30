package com.gec.backend.report.controller;

import com.gec.backend.report.dto.CreateEmergencyCallAttemptRequest;
import com.gec.backend.report.dto.EmergencyCallAttemptResponse;
import com.gec.backend.report.service.EmergencyCallAttemptService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/emergency-call-attempts")
public class PublicEmergencyCallAttemptController {

    private final EmergencyCallAttemptService callAttemptService;

    public PublicEmergencyCallAttemptController(EmergencyCallAttemptService callAttemptService) {
        this.callAttemptService = callAttemptService;
    }

    @PostMapping
    public ResponseEntity<EmergencyCallAttemptResponse> createCallAttempt(
        @Valid @RequestBody CreateEmergencyCallAttemptRequest request,
        @RequestHeader(value = "X-Installation-ID", required = false) String installationPublicId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(callAttemptService.createCallAttempt(request, installationPublicId));
    }

    @PatchMapping("/{callAttemptId}/launched")
    public ResponseEntity<EmergencyCallAttemptResponse> markCallLaunched(@PathVariable UUID callAttemptId) {
        return ResponseEntity.ok(callAttemptService.markCallLaunched(callAttemptId));
    }
}
