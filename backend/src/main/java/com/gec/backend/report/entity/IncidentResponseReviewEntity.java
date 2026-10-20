package com.gec.backend.report.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Reviews are linked to agency assignments rather than only to the parent report so citizens
 * can independently rate each responding agency in a multi-agency incident.
 */
@Entity
@Table(name = "incident_response_review")
public class IncidentResponseReviewEntity {

    @Id
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(name = "public_user_id", nullable = false)
    private UUID publicUserId;

    @Column(name = "agency_id")
    private UUID agencyId;

    @Column(nullable = false)
    private short rating;

    @Column(name = "response_speed_rating")
    private Short responseSpeedRating;

    @Column(name = "professionalism_rating")
    private Short professionalismRating;

    @Column(name = "helpfulness_rating")
    private Short helpfulnessRating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public IncidentResponseReviewEntity() {}

    public IncidentResponseReviewEntity(
        UUID id,
        UUID reportId,
        UUID assignmentId,
        UUID publicUserId,
        UUID agencyId,
        short rating,
        Short responseSpeedRating,
        Short professionalismRating,
        Short helpfulnessRating,
        String comment
    ) {
        this.id = id;
        this.reportId = reportId;
        this.assignmentId = assignmentId;
        this.publicUserId = publicUserId;
        this.agencyId = agencyId;
        this.rating = rating;
        this.responseSpeedRating = responseSpeedRating;
        this.professionalismRating = professionalismRating;
        this.helpfulnessRating = helpfulnessRating;
        this.comment = comment;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReportId() { return reportId; }
    public void setReportId(UUID reportId) { this.reportId = reportId; }
    public UUID getAssignmentId() { return assignmentId; }
    public void setAssignmentId(UUID assignmentId) { this.assignmentId = assignmentId; }
    public UUID getPublicUserId() { return publicUserId; }
    public void setPublicUserId(UUID publicUserId) { this.publicUserId = publicUserId; }
    public UUID getAgencyId() { return agencyId; }
    public void setAgencyId(UUID agencyId) { this.agencyId = agencyId; }
    public short getRating() { return rating; }
    public void setRating(short rating) { this.rating = rating; }
    public Short getResponseSpeedRating() { return responseSpeedRating; }
    public void setResponseSpeedRating(Short responseSpeedRating) { this.responseSpeedRating = responseSpeedRating; }
    public Short getProfessionalismRating() { return professionalismRating; }
    public void setProfessionalismRating(Short professionalismRating) { this.professionalismRating = professionalismRating; }
    public Short getHelpfulnessRating() { return helpfulnessRating; }
    public void setHelpfulnessRating(Short helpfulnessRating) { this.helpfulnessRating = helpfulnessRating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
