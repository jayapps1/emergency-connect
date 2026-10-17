package com.gec.backend.report.entity;

import com.gec.backend.agency.entity.AgencyType;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "incident_category")
public class IncidentCategoryEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_severity", nullable = false)
    private IncidentSeverity defaultSeverity;

    @Column(name = "supports_silent", nullable = false)
    private boolean supportsSilent = false;

    @Column(name = "supports_general", nullable = false)
    private boolean supportsGeneral = true;

    @Column(name = "supports_call", nullable = false)
    private boolean supportsCall = false;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "incident_category_agency", joinColumns = @JoinColumn(name = "incident_category_id"))
    @Column(name = "agency_type")
    @Enumerated(EnumType.STRING)
    private Set<AgencyType> defaultAgencyTypes = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public IncidentCategoryEntity() {}

    public IncidentCategoryEntity(UUID id, String code, String name, String description, IncidentSeverity defaultSeverity, boolean supportsSilent, boolean supportsGeneral, boolean supportsCall, int displayOrder, boolean active, Set<AgencyType> defaultAgencyTypes) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.description = description;
        this.defaultSeverity = defaultSeverity;
        this.supportsSilent = supportsSilent;
        this.supportsGeneral = supportsGeneral;
        this.supportsCall = supportsCall;
        this.displayOrder = displayOrder;
        this.active = active;
        this.defaultAgencyTypes = defaultAgencyTypes;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public IncidentSeverity getDefaultSeverity() { return defaultSeverity; }
    public void setDefaultSeverity(IncidentSeverity defaultSeverity) { this.defaultSeverity = defaultSeverity; }
    public boolean isSupportsSilent() { return supportsSilent; }
    public void setSupportsSilent(boolean supportsSilent) { this.supportsSilent = supportsSilent; }
    public boolean isSupportsGeneral() { return supportsGeneral; }
    public void setSupportsGeneral(boolean supportsGeneral) { this.supportsGeneral = supportsGeneral; }
    public boolean isSupportsCall() { return supportsCall; }
    public void setSupportsCall(boolean supportsCall) { this.supportsCall = supportsCall; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Set<AgencyType> getDefaultAgencyTypes() { return defaultAgencyTypes; }
    public void setDefaultAgencyTypes(Set<AgencyType> defaultAgencyTypes) { this.defaultAgencyTypes = defaultAgencyTypes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
