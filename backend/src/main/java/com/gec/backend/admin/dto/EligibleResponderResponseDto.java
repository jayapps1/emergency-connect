package com.gec.backend.admin.dto;

import java.util.UUID;

public class EligibleResponderResponseDto {

    private UUID id;
    private String fullName;
    private String email;
    private String role;
    private UUID agencyId;
    private String agencyName;
    private UUID stationId;
    private String stationName;
    private boolean active;
    private boolean assigned;

    public EligibleResponderResponseDto() {}

    public EligibleResponderResponseDto(UUID id, String fullName, String email, String role, UUID agencyId, String agencyName, UUID stationId, String stationName, boolean active, boolean assigned) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.agencyId = agencyId;
        this.agencyName = agencyName;
        this.stationId = stationId;
        this.stationName = stationName;
        this.active = active;
        this.assigned = assigned;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public UUID getAgencyId() { return agencyId; }
    public void setAgencyId(UUID agencyId) { this.agencyId = agencyId; }
    public String getAgencyName() { return agencyName; }
    public void setAgencyName(String agencyName) { this.agencyName = agencyName; }
    public UUID getStationId() { return stationId; }
    public void setStationId(UUID stationId) { this.stationId = stationId; }
    public String getStationName() { return stationName; }
    public void setStationName(String stationName) { this.stationName = stationName; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isAssigned() { return assigned; }
    public void setAssigned(boolean assigned) { this.assigned = assigned; }
}
