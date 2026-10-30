package com.gec.backend.appliance.controller;

import com.gec.backend.appliance.service.ResponseAvailabilityService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/appliances")
public class AdminApplianceController {

    private final ResponseAvailabilityService availabilityService;

    public AdminApplianceController(ResponseAvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('STATION_READ')")
    public ResponseEntity<List<Map<String, Object>>> getAdminAppliances() {
        return ResponseEntity.ok(availabilityService.getAdminAppliances());
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('STATION_READ')")
    public ResponseEntity<Map<String, Object>> getAgencyApplianceSummary() {
        return ResponseEntity.ok(availabilityService.getAgencyApplianceSummary());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('STATION_UPDATE')")
    public ResponseEntity<Map<String, Object>> createAppliance(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(availabilityService.createAppliance(body));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('STATION_UPDATE')")
    public ResponseEntity<Map<String, Object>> updateAppliance(
        @PathVariable UUID id,
        @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(availabilityService.updateAppliance(id, body));
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAuthority('STATION_UPDATE')")
    public ResponseEntity<Map<String, Object>> updateApplianceStatus(
        @PathVariable UUID id,
        @RequestBody Map<String, String> body
    ) {
        String status = body.get("status");
        String reason = body.get("reason");
        return ResponseEntity.ok(availabilityService.updateApplianceStatus(id, status, reason));
    }

    @PostMapping("/{id}/relocate")
    @PreAuthorize("hasAuthority('STATION_UPDATE')")
    public ResponseEntity<Map<String, Object>> relocateAppliance(
        @PathVariable UUID id,
        @RequestBody Map<String, String> body
    ) {
        UUID newStationId = UUID.fromString(body.get("currentStationId"));
        return ResponseEntity.ok(availabilityService.relocateAppliance(id, newStationId));
    }

    @PostMapping("/{id}/return-home")
    @PreAuthorize("hasAuthority('STATION_UPDATE')")
    public ResponseEntity<Map<String, Object>> returnToHomeStation(@PathVariable UUID id) {
        return ResponseEntity.ok(availabilityService.returnToHomeStation(id));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('STATION_UPDATE')")
    public ResponseEntity<Map<String, Object>> deactivateAppliance(@PathVariable UUID id) {
        return ResponseEntity.ok(availabilityService.deactivateAppliance(id));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAuthority('STATION_READ')")
    public ResponseEntity<List<Map<String, Object>>> getApplianceHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(availabilityService.getApplianceHistory(id));
    }
}
