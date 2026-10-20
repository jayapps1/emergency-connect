package com.gec.backend.notification.controller;

import com.gec.backend.notification.entity.PublicNotificationEntity;
import com.gec.backend.notification.service.PublicNotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/account")
public class PublicNotificationController {

    private final PublicNotificationService notificationService;

    public PublicNotificationController(PublicNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/notifications")
    public ResponseEntity<Page<PublicNotificationEntity>> getNotifications(Pageable pageable) {
        return ResponseEntity.ok(notificationService.getNotifications(pageable));
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount()));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/devices/push-token")
    public ResponseEntity<Void> registerPushToken(
        @RequestBody Map<String, String> body,
        @RequestHeader(value = "X-Installation-ID", required = false) String installationId
    ) {
        String token = body.get("token");
        notificationService.registerPushToken(token, installationId);
        return ResponseEntity.ok().build();
    }
}
