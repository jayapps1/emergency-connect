package com.gec.backend.report.controller;

import com.gec.backend.report.dto.*;
import com.gec.backend.report.service.IncidentFollowUpService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff")
public class IncidentFollowUpController {

    private final IncidentFollowUpService followUpService;

    public IncidentFollowUpController(IncidentFollowUpService followUpService) {
        this.followUpService = followUpService;
    }

    @PostMapping("/incidents/follow-ups")
    public ResponseEntity<IncidentFollowUpResponseDto> createFollowUp(@Valid @RequestBody CreateIncidentFollowUpDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(followUpService.createFollowUp(dto));
    }

    @GetMapping("/incidents/{reportId}/follow-ups")
    public ResponseEntity<List<IncidentFollowUpResponseDto>> getFollowUpsForReport(@PathVariable UUID reportId) {
        return ResponseEntity.ok(followUpService.getFollowUpsForReport(reportId));
    }

    @PatchMapping("/follow-ups/{followUpId}/status")
    public ResponseEntity<IncidentFollowUpResponseDto> updateFollowUpStatus(
        @PathVariable UUID followUpId,
        @RequestParam String status
    ) {
        return ResponseEntity.ok(followUpService.updateFollowUpStatus(followUpId, status));
    }
}
