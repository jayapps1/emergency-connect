package com.gec.backend.admin.controller;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Real-time Server-Sent Events (SSE) stream for staff mobile clients.
 * Emits scoped incident assignment events (INCIDENT_ASSIGNED, STATUS_CHANGED) to connected staff.
 */
@RestController
@RequestMapping("/api/v1/staff")
public class StaffRealtimeController {

    private static final Logger log = LoggerFactory.getLogger(StaffRealtimeController.class);

    private final AdminScopeService scopeService;
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public StaffRealtimeController(AdminScopeService scopeService) {
        this.scopeService = scopeService;
    }

    @GetMapping(path = "/incidents/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamIncidents() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        String emitterKey = principal.getId().toString() + "_" + System.currentTimeMillis();

        SseEmitter emitter = new SseEmitter(180_000L); // 3 minutes timeout
        emitters.put(emitterKey, emitter);

        emitter.onCompletion(() -> emitters.remove(emitterKey));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitterKey);
        });
        emitter.onError((e) -> emitters.remove(emitterKey));

        // Initial heartbeat
        executor.execute(() -> {
            try {
                emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of("message", "Connected to GEC Staff Real-time Event Stream", "staffUserId", principal.getId().toString())));
            } catch (IOException e) {
                emitters.remove(emitterKey);
            }
        });

        return emitter;
    }
}
