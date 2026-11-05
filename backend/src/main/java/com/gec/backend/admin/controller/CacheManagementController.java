package com.gec.backend.admin.controller;

import com.gec.backend.common.service.CacheManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/cache")
@PreAuthorize("(hasRole('SYSTEM_ADMIN') or hasRole('ROLE_SYSTEM_ADMIN')) and hasAuthority('SYSTEM_SETTINGS_MANAGE')")
public class CacheManagementController {

    private final CacheManagementService cacheService;

    public CacheManagementController(CacheManagementService cacheService) {
        this.cacheService = cacheService;
    }

    @GetMapping("/metrics")
    public ResponseEntity<List<Map<String, Object>>> getCacheMetrics() {
        return ResponseEntity.ok(cacheService.getCacheMetrics());
    }

    @PostMapping("/clear")
    public ResponseEntity<Map<String, Object>> clearCache(@RequestParam(required = false) String cacheName) {
        if (cacheName != null && !cacheName.isBlank()) {
            return ResponseEntity.ok(cacheService.clearCache(cacheName));
        } else {
            return ResponseEntity.ok(cacheService.clearAllCaches());
        }
    }
}
