package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.AdminReportDetailsResponse;
import com.gec.backend.admin.dto.AdminReportSummaryResponse;
import com.gec.backend.admin.dto.AdminUserResponse;
import com.gec.backend.admin.service.StaffMobileService;
import com.gec.backend.messaging.entity.StaffNotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff")
public class StaffMobileController {

    private final StaffMobileService staffMobileService;

    public StaffMobileController(StaffMobileService staffMobileService) {
        this.staffMobileService = staffMobileService;
    }

    @GetMapping("/me")
    public ResponseEntity<AdminUserResponse> getStaffProfile() {
        return ResponseEntity.ok(staffMobileService.getStaffProfile());
    }

    @GetMapping("/incidents")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<Page<AdminReportSummaryResponse>> getStaffIncidents(Pageable pageable) {
        return ResponseEntity.ok(staffMobileService.getStaffIncidents(pageable));
    }

    @GetMapping("/incidents/{reportId}")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    public ResponseEntity<AdminReportDetailsResponse> getStaffIncidentDetail(@PathVariable UUID reportId) {
        return ResponseEntity.ok(staffMobileService.getStaffIncidentDetail(reportId));
    }

    @PostMapping("/devices")
    public ResponseEntity<Void> registerStaffDevice(@RequestBody Map<String, String> body) {
        staffMobileService.registerStaffDevice(body);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/devices/{installationId}")
    public ResponseEntity<Void> revokeStaffDevice(@PathVariable String installationId) {
        staffMobileService.revokeStaffDevice(installationId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/notifications")
    public ResponseEntity<Page<StaffNotificationEntity>> getStaffNotifications(Pageable pageable) {
        return ResponseEntity.ok(staffMobileService.getStaffNotifications(pageable));
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadNotificationCount() {
        return ResponseEntity.ok(staffMobileService.getUnreadNotificationCount());
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationAsRead(@PathVariable UUID id) {
        staffMobileService.markNotificationAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllNotificationsAsRead() {
        staffMobileService.markAllNotificationsAsRead();
        return ResponseEntity.ok().build();
    }
}
