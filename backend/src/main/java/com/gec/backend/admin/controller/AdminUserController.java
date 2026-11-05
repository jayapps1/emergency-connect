package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.service.AdminUserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final AdminUserService userService;

    public AdminUserController(AdminUserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN_USER_READ')")
    public ResponseEntity<Page<AdminUserResponse>> getUsers(Pageable pageable) {
        return ResponseEntity.ok(userService.getUsers(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_USER_READ')")
    public ResponseEntity<AdminUserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN_USER_CREATE')")
    public ResponseEntity<CreateUserResponse> createUser(@Valid @RequestBody CreateAdminUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_USER_UPDATE')")
    public ResponseEntity<AdminUserResponse> updateUser(
        @PathVariable UUID id,
        @Valid @RequestBody CreateAdminUserRequest request
    ) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('ADMIN_USER_DELETE')")
    public ResponseEntity<AdminUserResponse> deactivateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.deactivateUser(id));
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasAuthority('ADMIN_USER_UPDATE')")
    public ResponseEntity<AdminUserResponse> reactivateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.reactivateUser(id));
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('ADMIN_USER_UPDATE')")
    public ResponseEntity<Map<String, String>> resetUserPassword(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.resetUserPassword(id));
    }

    @PostMapping("/transfer-leadership")
    @PreAuthorize("hasAuthority('ADMIN_USER_UPDATE') or hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<AdminUserResponse> transferAgencyLeadership(@RequestBody Map<String, String> body) {
        UUID recipientUserId = UUID.fromString(body.get("recipientUserId"));
        String password = body.get("password");
        String reason = body.get("reason");
        return ResponseEntity.ok(userService.transferAgencyLeadership(recipientUserId, password, reason));
    }

    @PostMapping("/transfer-national-leadership")
    @PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<AdminUserResponse> transferNationalLeadership(@RequestBody Map<String, String> body) {
        UUID recipientUserId = UUID.fromString(body.get("recipientUserId"));
        String password = body.get("password");
        String reason = body.get("reason");
        return ResponseEntity.ok(userService.transferNationalLeadership(recipientUserId, password, reason));
    }

    @PostMapping("/configure-agency-priorities")
    @PreAuthorize("hasRole('ROLE_SYSTEM_ADMIN')")
    public ResponseEntity<List<AdminUserResponse>> configureAgencyPriorities(
        @RequestParam UUID agencyId,
        @RequestBody Map<UUID, Integer> priorityMap
    ) {
        return ResponseEntity.ok(userService.configureAgencyPriorities(agencyId, priorityMap));
    }
}
