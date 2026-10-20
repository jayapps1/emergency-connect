package com.gec.backend.publicuser.controller;

import com.gec.backend.publicuser.service.PublicAuthService;
import com.gec.backend.report.dto.TrackedReportResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/auth")
public class PublicAuthController {

    private final PublicAuthService publicAuthService;

    public PublicAuthController(PublicAuthService publicAuthService) {
        this.publicAuthService = publicAuthService;
    }

    @PostMapping("/register/request-otp")
    public ResponseEntity<Map<String, String>> requestRegisterOtp(@RequestBody Map<String, String> body) {
        String phoneNumber = body.get("phoneNumber");
        return ResponseEntity.ok(publicAuthService.requestOtp(phoneNumber));
    }

    @PostMapping("/register/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyRegisterOtp(
        @RequestBody Map<String, String> body,
        @RequestHeader(value = "X-Installation-ID", required = false) String installationPublicId
    ) {
        String phoneNumber = body.get("phoneNumber");
        String code = body.get("code");
        return ResponseEntity.ok(publicAuthService.verifyOtpAndAuthenticate(phoneNumber, code, installationPublicId));
    }

    @PostMapping("/login/request-otp")
    public ResponseEntity<Map<String, String>> requestLoginOtp(@RequestBody Map<String, String> body) {
        String phoneNumber = body.get("phoneNumber");
        return ResponseEntity.ok(publicAuthService.requestOtp(phoneNumber));
    }

    @PostMapping("/login/request-sms-fallback")
    public ResponseEntity<Map<String, String>> requestSmsFallbackOtp(@RequestBody Map<String, String> body) {
        String phoneNumber = body.get("phoneNumber");
        return ResponseEntity.ok(publicAuthService.requestSmsFallbackOtp(phoneNumber));
    }

    @PostMapping("/login/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyLoginOtp(
        @RequestBody Map<String, String> body,
        @RequestHeader(value = "X-Installation-ID", required = false) String installationPublicId
    ) {
        String phoneNumber = body.get("phoneNumber");
        String code = body.get("code");
        return ResponseEntity.ok(publicAuthService.verifyOtpAndAuthenticate(phoneNumber, code, installationPublicId));
    }

    @PostMapping("/login/verify-totp")
    public ResponseEntity<Map<String, Object>> verifyPublicTotpLogin(
        @RequestBody Map<String, String> body,
        @RequestHeader(value = "X-Installation-ID", required = false) String installationPublicId
    ) {
        String phoneNumber = body.get("phoneNumber");
        String code = body.get("code");
        return ResponseEntity.ok(publicAuthService.verifyPublicTotpLogin(phoneNumber, code, installationPublicId));
    }

    @PostMapping("/claim-report")
    public ResponseEntity<TrackedReportResponse> claimReport(@RequestBody Map<String, String> body) {
        String reference = body.get("reference");
        String trackingToken = body.get("trackingToken");
        return ResponseEntity.ok(publicAuthService.claimReport(reference, trackingToken));
    }

    @PostMapping("/reports/{reportId}/assignments/{assignmentId}/review")
    public ResponseEntity<TrackedReportResponse> submitResponseReview(
        @PathVariable String reportId,
        @PathVariable UUID assignmentId,
        @RequestBody Map<String, Object> body
    ) {
        short rating = ((Number) body.getOrDefault("rating", 5)).shortValue();
        Short speed = body.containsKey("responseSpeedRating") && body.get("responseSpeedRating") != null ? ((Number) body.get("responseSpeedRating")).shortValue() : null;
        Short prof = body.containsKey("professionalismRating") && body.get("professionalismRating") != null ? ((Number) body.get("professionalismRating")).shortValue() : null;
        Short helpful = body.containsKey("helpfulnessRating") && body.get("helpfulnessRating") != null ? ((Number) body.get("helpfulnessRating")).shortValue() : null;
        String comment = (String) body.get("comment");

        return ResponseEntity.ok(publicAuthService.submitResponseReview(reportId, assignmentId, rating, speed, prof, helpful, comment));
    }

    @PutMapping("/reports/{reportId}/assignments/{assignmentId}/review")
    public ResponseEntity<TrackedReportResponse> updateResponseReview(
        @PathVariable String reportId,
        @PathVariable UUID assignmentId,
        @RequestBody Map<String, Object> body
    ) {
        return submitResponseReview(reportId, assignmentId, body);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUserInfo() {
        return ResponseEntity.ok(publicAuthService.getCurrentPublicUserInfo());
    }

    @GetMapping("/my-reports")
    public ResponseEntity<List<TrackedReportResponse>> getMyReports(
        @RequestHeader(value = "X-Installation-ID", required = false) String installationPublicId
    ) {
        return ResponseEntity.ok(publicAuthService.getMyReports(installationPublicId));
    }
}
