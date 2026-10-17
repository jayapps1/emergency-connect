package com.gec.backend.station.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "station_contact")
public class StationContactEntity {

    @Id
    private UUID id;

    @Column(name = "station_id", nullable = false)
    private UUID stationId;

    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    @Column(name = "normalized_phone_number")
    private String normalizedPhoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "contact_type", nullable = false)
    private StationContactType contactType;

    @Column(nullable = false)
    private int priority = 1;

    @Column(name = "public_contact", nullable = false)
    private boolean publicContact = true;

    @Column(name = "available_24_hour", nullable = false)
    private boolean available24Hour = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public StationContactEntity() {}

    public StationContactEntity(UUID id, UUID stationId, String phoneNumber, StationContactType contactType, int priority, boolean publicContact, boolean available24Hour, boolean active, boolean verified) {
        this.id = id;
        this.stationId = stationId;
        this.phoneNumber = phoneNumber;
        this.contactType = contactType;
        this.priority = priority;
        this.publicContact = publicContact;
        this.available24Hour = available24Hour;
        this.active = active;
        this.verified = verified;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getStationId() { return stationId; }
    public void setStationId(UUID stationId) { this.stationId = stationId; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getNormalizedPhoneNumber() { return normalizedPhoneNumber; }
    public void setNormalizedPhoneNumber(String normalizedPhoneNumber) { this.normalizedPhoneNumber = normalizedPhoneNumber; }
    public StationContactType getContactType() { return contactType; }
    public void setContactType(StationContactType contactType) { this.contactType = contactType; }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
    public boolean isPublicContact() { return publicContact; }
    public void setPublicContact(boolean publicContact) { this.publicContact = publicContact; }
    public boolean isAvailable24Hour() { return available24Hour; }
    public void setAvailable24Hour(boolean available24Hour) { this.available24Hour = available24Hour; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
