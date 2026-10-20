package com.gec.backend.admin.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.report.entity.IncidentResponseReviewEntity;
import com.gec.backend.report.repository.IncidentReportRepository;
import com.gec.backend.report.repository.IncidentResponseReviewRepository;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AdminReviewService {

    private final IncidentResponseReviewRepository reviewRepository;
    private final IncidentReportRepository reportRepository;
    private final StationRepository stationRepository;
    private final AdminScopeService scopeService;

    public AdminReviewService(
        IncidentResponseReviewRepository reviewRepository,
        IncidentReportRepository reportRepository,
        StationRepository stationRepository,
        AdminScopeService scopeService
    ) {
        this.reviewRepository = reviewRepository;
        this.reportRepository = reportRepository;
        this.stationRepository = stationRepository;
        this.scopeService = scopeService;
    }

    public Page<Map<String, Object>> getAdminReviews(UUID stationId, Short rating, Pageable pageable) {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        UUID targetAgencyId = scopeService.isSystemAdmin() ? null : principal.getAgencyId();

        List<IncidentResponseReviewEntity> allReviews;
        if (targetAgencyId != null) {
            allReviews = reviewRepository.findByAgencyId(targetAgencyId);
        } else {
            allReviews = reviewRepository.findAll();
        }

        List<Map<String, Object>> filtered = allReviews.stream()
            .filter(r -> rating == null || r.getRating() == rating.shortValue())
            .map(this::mapToReviewDto)
            .sorted((a, b) -> ((String) b.get("createdAt")).compareTo((String) a.get("createdAt")))
            .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filtered.size());
        List<Map<String, Object>> pageContent = start <= end ? filtered.subList(start, end) : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    public Map<String, Object> getAdminReviewSummary() {
        AdminUserPrincipal principal = scopeService.getCurrentPrincipal();
        UUID targetAgencyId = scopeService.isSystemAdmin() ? null : principal.getAgencyId();

        List<IncidentResponseReviewEntity> allReviews;
        if (targetAgencyId != null) {
            allReviews = reviewRepository.findByAgencyId(targetAgencyId);
        } else {
            allReviews = reviewRepository.findAll();
        }

        if (allReviews.isEmpty()) {
            return Map.of(
                "averageRating", 0.0,
                "totalReviews", 0,
                "fiveStarCount", 0,
                "ratingDistribution", Map.of("1", 0, "2", 0, "3", 0, "4", 0, "5", 0),
                "byStation", Collections.emptyList()
            );
        }

        double sum = allReviews.stream().mapToInt(IncidentResponseReviewEntity::getRating).sum();
        double avg = Math.round((sum / allReviews.size()) * 10.0) / 10.0;
        long fiveStar = allReviews.stream().filter(r -> r.getRating() == 5).count();

        Map<String, Integer> dist = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            final int star = i;
            dist.put(String.valueOf(star), (int) allReviews.stream().filter(r -> r.getRating() == star).count());
        }

        return Map.of(
            "averageRating", avg,
            "totalReviews", allReviews.size(),
            "fiveStarCount", fiveStar,
            "ratingDistribution", dist
        );
    }

    private Map<String, Object> mapToReviewDto(IncidentResponseReviewEntity review) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", review.getId().toString());
        dto.put("reportId", review.getReportId().toString());
        dto.put("assignmentId", review.getAssignmentId().toString());
        dto.put("rating", review.getRating());
        dto.put("responseSpeedRating", review.getResponseSpeedRating());
        dto.put("professionalismRating", review.getProfessionalismRating());
        dto.put("helpfulnessRating", review.getHelpfulnessRating());
        dto.put("comment", review.getComment());
        dto.put("createdAt", review.getCreatedAt().toString());

        reportRepository.findById(review.getReportId()).ifPresent(rep -> {
            dto.put("publicReference", rep.getPublicReference());
        });

        return dto;
    }
}
