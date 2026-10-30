package com.gec.backend.safety.controller;

import com.gec.backend.safety.service.SafetyInformationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/safety-information")
public class PublicSafetyInformationController {

    private final SafetyInformationService safetyService;

    public PublicSafetyInformationController(SafetyInformationService safetyService) {
        this.safetyService = safetyService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getPublicActivePosts(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String severity
    ) {
        return ResponseEntity.ok(safetyService.getPublicActivePosts(category, severity));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPublicPostById(@PathVariable UUID id) {
        return ResponseEntity.ok(safetyService.getPublicPostById(id));
    }
}
