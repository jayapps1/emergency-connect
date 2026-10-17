package com.gec.backend.station.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.common.exception.ResourceConflictException;
import com.gec.backend.common.exception.ResourceNotFoundException;
import com.gec.backend.common.util.PhoneNumberNormalizer;
import com.gec.backend.reference.entity.DistrictRefEntity;
import com.gec.backend.reference.entity.RegionRefEntity;
import com.gec.backend.reference.entity.StationLevel;
import com.gec.backend.reference.repository.DistrictRefRepository;
import com.gec.backend.reference.repository.RegionRefRepository;
import com.gec.backend.station.dto.StationContactResponse;
import com.gec.backend.station.dto.StationDetailsResponse;
import com.gec.backend.station.dto.StationResponse;
import com.gec.backend.station.entity.StationContactEntity;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.mapper.StationMapper;
import com.gec.backend.station.repository.StationContactRepository;
import com.gec.backend.station.repository.StationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service managing emergency station lifecycles, geographic information, administrative levels,
 * contact numbers, and publication eligibility across Ghana Emergency Connect.
 *
 * <p>Key Business & Security Rules:
 * <ul>
 *   <li><b>Verification Hierarchy:</b> Stations are created in an unverified state. A station must be
 *       verified before any of its associated contacts can be verified or published.</li>
 *   <li><b>Public Publication Eligibility:</b> Public APIs publish contacts only when ALL four
 *       conditions hold: station is active, station is verified, contact is active, contact is verified,
 *       and contact is explicitly flagged as publicContact = true.</li>
 *   <li><b>Visibility Control:</b> The publicContact flag governs mobile app publication and is independent
 *       of the active status. Internal contacts are accessible solely to authenticated administrators.</li>
 *   <li><b>Priority Uniqueness:</b> Contact priority ordering is strictly unique per station (e.g. Priority #1
 *       is unique per station compound). Attempts to assign duplicate priorities return HTTP 409 CONFLICT.</li>
 *   <li><b>Phone Normalization & Duplication:</b> All station telephone numbers are normalized to canonical
 *       Ghana format (+233XXXXXXXXX) and guaranteed unique across all station contacts to prevent routing conflicts.</li>
 *   <li><b>Administrative Scope:</b> Non-SYSTEM_ADMIN users are strictly isolated to their assigned agency
 *       or station scope.</li>
 * </ul>
 */
@Service
public class StationService {

    private final StationRepository stationRepository;
    private final StationContactRepository contactRepository;
    private final RegionRefRepository regionRefRepository;
    private final DistrictRefRepository districtRefRepository;
    private final StationMapper stationMapper;
    private final AdminScopeService scopeService;
    private final AuditService auditService;

    public StationService(
        StationRepository stationRepository,
        StationContactRepository contactRepository,
        RegionRefRepository regionRefRepository,
        DistrictRefRepository districtRefRepository,
        StationMapper stationMapper,
        AdminScopeService scopeService,
        AuditService auditService
    ) {
        this.stationRepository = stationRepository;
        this.contactRepository = contactRepository;
        this.regionRefRepository = regionRefRepository;
        this.districtRefRepository = districtRefRepository;
        this.stationMapper = stationMapper;
        this.scopeService = scopeService;
        this.auditService = auditService;
    }

    /**
     * Retrieves active and verified emergency stations belonging to a specific agency.
     * Public Android clients consume this endpoint for nearby station discovery.
     *
     * @param agencyId the target agency UUID
     * @return list of published station DTOs
     */
    public List<StationResponse> getActiveVerifiedStationsByAgency(UUID agencyId) {
        return stationRepository.findByAgencyIdAndActiveTrueAndVerifiedTrue(agencyId)
            .stream()
            .map(stationMapper::toResponse)
            .toList();
    }

    /**
     * Retrieves paginated station records scoped to the authenticated administrator's scope.
     *
     * @param pageable pagination options
     * @return paginated station records
     */
    public Page<StationResponse> getAdminStations(Pageable pageable) {
        if (scopeService.isSystemAdmin()) {
            return stationRepository.findAll(pageable).map(stationMapper::toResponse);
        } else {
            UUID agencyId = scopeService.getCurrentPrincipal().getAgencyId();
            return stationRepository.findByAgencyId(agencyId, pageable).map(stationMapper::toResponse);
        }
    }

    /**
     * Searches administrative station records by name or station code.
     *
     * @param query string fragment to match against name or code
     * @return matching station records
     */
    public List<StationResponse> searchStations(String query) {
        String q = query == null ? "" : query.trim();
        return stationRepository.findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(q, q)
            .stream()
            .map(stationMapper::toResponse)
            .toList();
    }

    /**
     * Retrieves comprehensive station details and all contacts (both public and internal)
     * for administrative management. Validates agency scope.
     *
     * @param stationId the station UUID
     * @return station details and contact list
     */
    public StationDetailsResponse getStationDetails(UUID stationId) {
        StationEntity stationEntity = stationRepository.findById(stationId)
            .orElseThrow(() -> new ResourceNotFoundException("Station not found: " + stationId));

        scopeService.validateAgencyScope(stationEntity.getAgencyId());

        StationResponse stationResponse = stationMapper.toResponse(stationEntity);
        List<StationContactResponse> contacts = contactRepository
            .findByStationIdOrderByPriorityAsc(stationId)
            .stream()
            .map(stationMapper::toContactResponse)
            .toList();

        return new StationDetailsResponse(stationResponse, contacts);
    }

    /**
     * Retrieves public station details for mobile and web public clients.
     * Returns ONLY active, verified stations and active, verified, public contacts.
     *
     * @param stationId the station UUID
     * @return public station details and public contact list
     */
    public StationDetailsResponse getPublicStationDetails(UUID stationId) {
        StationEntity stationEntity = stationRepository.findByIdAndActiveTrueAndVerifiedTrue(stationId)
            .orElseThrow(() -> new ResourceNotFoundException("Station not found or not published: " + stationId));

        StationResponse stationResponse = stationMapper.toResponse(stationEntity);
        List<StationContactResponse> contacts = contactRepository
            .findByStationIdAndPublicContactTrueAndActiveTrueAndVerifiedTrueOrderByPriorityAsc(stationId)
            .stream()
            .map(stationMapper::toContactResponse)
            .toList();

        return new StationDetailsResponse(stationResponse, contacts);
    }

    /**
     * Retrieves all contacts associated with a station for administrative management.
     *
     * @param stationId the station UUID
     * @return list of station contacts ordered by priority ASC
     */
    public List<StationContactResponse> getStationContacts(UUID stationId) {
        StationEntity stationEntity = stationRepository.findById(stationId)
            .orElseThrow(() -> new ResourceNotFoundException("Station not found: " + stationId));

        scopeService.validateAgencyScope(stationEntity.getAgencyId());

        return contactRepository
            .findByStationIdOrderByPriorityAsc(stationId)
            .stream()
            .map(stationMapper::toContactResponse)
            .toList();
    }

    /**
     * Retrieves public, active, and verified contacts for a published station.
     *
     * @param stationId the station UUID
     * @return list of public station contacts ordered by priority ASC
     */
    public List<StationContactResponse> getPublicStationContacts(UUID stationId) {
        StationEntity stationEntity = stationRepository.findByIdAndActiveTrueAndVerifiedTrue(stationId)
            .orElseThrow(() -> new ResourceNotFoundException("Station not found or not published: " + stationId));

        return contactRepository
            .findByStationIdAndPublicContactTrueAndActiveTrueAndVerifiedTrueOrderByPriorityAsc(stationId)
            .stream()
            .map(stationMapper::toContactResponse)
            .toList();
    }

    /**
     * Retrieves all published Regional Headquarters (RHQ) stations and their public contacts
     * across all agencies and Ghana regions for offline emergency directory synchronization.
     *
     * @return list of published RHQ station details
     */
    public List<StationDetailsResponse> getPublicHeadquarters() {
        List<StationEntity> rhqStations = stationRepository.findByStationLevelAndActiveTrueAndVerifiedTrue(StationLevel.RHQ);
        return rhqStations.stream().map(stationEntity -> {
            StationResponse stationResponse = stationMapper.toResponse(stationEntity);
            List<StationContactResponse> contacts = contactRepository
                .findByStationIdAndPublicContactTrueAndActiveTrueAndVerifiedTrueOrderByPriorityAsc(stationEntity.getId())
                .stream()
                .map(stationMapper::toContactResponse)
                .toList();
            return new StationDetailsResponse(stationResponse, contacts);
        }).toList();
    }

    /**
     * Retrieves the published Regional Headquarters (RHQ) for a specific agency and region.
     *
     * @param agencyId the agency UUID
     * @param regionId the region UUID
     * @return published RHQ station details and public contacts
     */
    public StationDetailsResponse getPublicRegionalHeadquarters(UUID agencyId, UUID regionId) {
        List<StationEntity> rhqStations = stationRepository.findByAgencyIdAndRegionIdAndStationLevelAndActiveTrueAndVerifiedTrue(agencyId, regionId, StationLevel.RHQ);
        StationEntity stationEntity = rhqStations.stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Regional Headquarters not found for agency: " + agencyId + " and region: " + regionId));

        StationResponse stationResponse = stationMapper.toResponse(stationEntity);
        List<StationContactResponse> contacts = contactRepository
            .findByStationIdAndPublicContactTrueAndActiveTrueAndVerifiedTrueOrderByPriorityAsc(stationEntity.getId())
            .stream()
            .map(stationMapper::toContactResponse)
            .toList();

        return new StationDetailsResponse(stationResponse, contacts);
    }

    /**
     * Creates a new emergency station under an agency.
     * Stations are initialized in an unverified state by design.
     *
     * @param request creation parameters including coordinates, administrative level, and region
     * @return created station DTO
     */
    @Transactional
    public StationResponse createStation(CreateStationRequest request) {
        if (request.agencyId() == null) {
            throw new IllegalArgumentException("Agency selection is required to create a station.");
        }
        scopeService.validateAgencyScope(request.agencyId());

        if (stationRepository.existsByCode(request.code())) {
            throw new ResourceConflictException("STATION_CODE_ALREADY_EXISTS: Station code already exists: " + request.code());
        }

        String regionName = request.region();
        if (request.regionId() != null) {
            RegionRefEntity reg = regionRefRepository.findById(request.regionId()).orElse(null);
            if (reg != null) regionName = reg.getName();
        }

        String districtName = request.district();
        if (request.districtId() != null) {
            DistrictRefEntity dist = districtRefRepository.findById(request.districtId()).orElse(null);
            if (dist != null) {
                districtName = dist.getName();
                if (request.regionId() != null && !dist.getRegionId().equals(request.regionId())) {
                    throw new IllegalArgumentException("Selected district does not belong to the selected region.");
                }
            }
        }

        StationLevel level = request.stationLevel() != null ? request.stationLevel() : StationLevel.DISTRICT_STATION;
        if (level == StationLevel.DISTRICT_STATION && (request.districtId() == null && (districtName == null || districtName.isBlank()))) {
            throw new IllegalArgumentException("District is required for a District Station.");
        }

        // Prevent accidental creation of duplicate stations under the same agency, region, district, and level
        if (stationRepository.existsByAgencyIdAndRegionAndDistrictAndStationLevelAndNameIgnoreCase(
                request.agencyId(),
                regionName != null ? regionName : "General Region",
                districtName != null ? districtName : "General District",
                level,
                request.name()
        )) {
            throw new ResourceConflictException("STATION_ALREADY_EXISTS: A station with the same name, level, region and district already exists for this agency.");
        }

        UUID stationId = UUID.randomUUID();
        StationEntity station = new StationEntity(
            stationId,
            request.agencyId(),
            request.name(),
            request.code(),
            regionName != null ? regionName : "General Region",
            districtName != null ? districtName : "General District",
            request.locality(),
            request.latitude(),
            request.longitude(),
            request.locationAccuracyMeters(),
            true,
            false
        );
        station.setStationLevel(level);
        station.setRegionId(request.regionId());
        station.setDistrictId(request.districtId());

        stationRepository.save(station);

        if (request.primaryContact() != null && request.primaryContact().phoneNumber() != null && !request.primaryContact().phoneNumber().isBlank()) {
            CreateStationContactRequest contactReq = request.primaryContact();
            String normalizedPhone = PhoneNumberNormalizer.normalize(contactReq.phoneNumber());

            if (contactRepository.existsByStationIdAndPriority(stationId, contactReq.priority())) {
                throw new ResourceConflictException("CONTACT_PRIORITY_ALREADY_EXISTS: Priority " + contactReq.priority() + " is already assigned to another contact for this station.");
            }
            if (normalizedPhone != null && contactRepository.existsByNormalizedPhoneNumber(normalizedPhone)) {
                throw new ResourceConflictException("PHONE_NUMBER_ALREADY_EXISTS: This phone number is already assigned to another station contact.");
            }

            StationContactEntity primaryContact = new StationContactEntity(
                UUID.randomUUID(),
                stationId,
                contactReq.phoneNumber().trim(),
                contactReq.type(),
                contactReq.priority(),
                contactReq.publicContact(),
                contactReq.available24Hour(),
                true,
                false
            );
            primaryContact.setNormalizedPhoneNumber(normalizedPhone);
            contactRepository.save(primaryContact);
        }

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "STATION_CREATED", "STATION", stationId, request.agencyId(), "Created station " + station.getName(), null, null);

        return stationMapper.toResponse(station);
    }

    /**
     * Updates an existing station's name, region, district, locality, and geographic coordinates.
     * Logs STATION_LOCATION_UPDATED in audit logs when coordinates change.
     *
     * @param stationId the station UUID
     * @param request updated parameters
     * @return updated station DTO
     */
    @Transactional
    public StationResponse updateStation(UUID stationId, UpdateStationRequest request) {
        StationEntity station = stationRepository.findById(stationId)
            .orElseThrow(() -> new ResourceNotFoundException("Station not found: " + stationId));

        scopeService.validateAgencyScope(station.getAgencyId());

        boolean locationChanged = (station.getLatitude() != request.latitude()) || (station.getLongitude() != request.longitude());

        station.setName(request.name());
        station.setRegion(request.region());
        station.setDistrict(request.district());
        station.setLocality(request.locality());
        station.setLatitude(request.latitude());
        station.setLongitude(request.longitude());
        station.setLocationAccuracyMeters(request.locationAccuracyMeters());
        station.setUpdatedAt(LocalDateTime.now());

        stationRepository.save(station);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        if (locationChanged) {
            auditService.logAction(actorId, "STATION_LOCATION_UPDATED", "STATION", stationId, station.getAgencyId(),
                "Updated coordinates for " + station.getName() + " to (" + request.latitude() + ", " + request.longitude() + ")", null, null);
        } else {
            auditService.logAction(actorId, "STATION_UPDATED", "STATION", stationId, station.getAgencyId(), "Updated station " + station.getName(), null, null);
        }

        return stationMapper.toResponse(station);
    }

    /**
     * Marks a station as verified, allowing it to be published to mobile clients.
     *
     * @param stationId the station UUID
     * @return verified station DTO
     */
    @Transactional
    public StationResponse verifyStation(UUID stationId) {
        StationEntity station = stationRepository.findById(stationId)
            .orElseThrow(() -> new ResourceNotFoundException("Station not found: " + stationId));

        boolean hasVerifiedPublicContact = contactRepository.findByStationIdAndPublicContactTrueAndActiveTrueAndVerifiedTrueOrderByPriorityAsc(stationId)
            .stream().findFirst().isPresent();

        if (!hasVerifiedPublicContact) {
            List<StationContactEntity> contacts = contactRepository.findByStationIdOrderByPriorityAsc(stationId);
            for (StationContactEntity c : contacts) {
                if (c.isPublicContact() && c.isActive()) {
                    c.setVerified(true);
                    contactRepository.save(c);
                    hasVerifiedPublicContact = true;
                    break;
                }
            }
        }

        station.setVerified(true);
        station.setUpdatedAt(LocalDateTime.now());
        stationRepository.save(station);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "STATION_VERIFIED", "STATION", stationId, station.getAgencyId(), "Verified station " + station.getName(), null, null);

        return stationMapper.toResponse(station);
    }

    /**
     * Toggles a station's active status between active and inactive.
     *
     * @param stationId the station UUID
     * @return updated station DTO
     */
    @Transactional
    public StationResponse toggleStationStatus(UUID stationId) {
        StationEntity station = stationRepository.findById(stationId)
            .orElseThrow(() -> new ResourceNotFoundException("Station not found: " + stationId));

        scopeService.validateAgencyScope(station.getAgencyId());

        station.setActive(!station.isActive());
        station.setUpdatedAt(LocalDateTime.now());
        stationRepository.save(station);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "STATION_STATUS_TOGGLED", "STATION", stationId, station.getAgencyId(), "Toggled active status to " + station.isActive() + " for " + station.getName(), null, null);

        return stationMapper.toResponse(station);
    }

    /**
     * Creates a new contact number for a station.
     * Enforces contact priority uniqueness per station and normalized phone uniqueness across all contacts.
     *
     * @param stationId the station UUID
     * @param request contact parameters
     * @return created contact DTO
     */
    @Transactional
    public StationContactResponse createStationContact(UUID stationId, CreateStationContactRequest request) {
        StationEntity station = stationRepository.findById(stationId)
            .orElseThrow(() -> new ResourceNotFoundException("Station not found: " + stationId));

        scopeService.validateAgencyScope(station.getAgencyId());

        if (contactRepository.existsByStationIdAndPriority(stationId, request.priority())) {
            throw new ResourceConflictException("CONTACT_PRIORITY_ALREADY_EXISTS: Priority " + request.priority() + " is already assigned to another contact for this station.");
        }

        String normalizedPhone = PhoneNumberNormalizer.normalize(request.phoneNumber());
        if (normalizedPhone != null && contactRepository.existsByNormalizedPhoneNumber(normalizedPhone)) {
            throw new ResourceConflictException("PHONE_NUMBER_ALREADY_EXISTS: This phone number is already assigned to another station contact.");
        }

        UUID contactId = UUID.randomUUID();
        StationContactEntity contact = new StationContactEntity(
            contactId,
            stationId,
            request.phoneNumber().trim(),
            request.type(),
            request.priority(),
            request.publicContact(),
            request.available24Hour(),
            true,
            false
        );
        contact.setNormalizedPhoneNumber(normalizedPhone);
        contactRepository.save(contact);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "STATION_CONTACT_CREATED", "STATION_CONTACT", contactId, station.getAgencyId(), "Created contact " + contact.getPhoneNumber() + " for station " + station.getName(), null, null);

        return stationMapper.toContactResponse(contact);
    }

    /**
     * Updates an existing station contact number, priority, contact type, and visibility.
     * Enforces priority uniqueness per station and normalized phone uniqueness across all contacts.
     *
     * @param contactId the contact UUID
     * @param request updated parameters
     * @return updated contact DTO
     */
    @Transactional
    public StationContactResponse updateStationContact(UUID contactId, UpdateStationContactRequest request) {
        StationContactEntity contact = contactRepository.findById(contactId)
            .orElseThrow(() -> new ResourceNotFoundException("Station contact not found: " + contactId));

        StationEntity station = stationRepository.findById(contact.getStationId())
            .orElseThrow(() -> new ResourceNotFoundException("Station not found for contact: " + contactId));

        scopeService.validateAgencyScope(station.getAgencyId());

        if (contactRepository.existsByStationIdAndPriorityAndIdNot(station.getId(), request.priority(), contactId)) {
            throw new ResourceConflictException("CONTACT_PRIORITY_ALREADY_EXISTS: Priority " + request.priority() + " is already assigned to another contact for this station.");
        }

        String normalizedPhone = PhoneNumberNormalizer.normalize(request.phoneNumber());
        if (normalizedPhone != null && contactRepository.existsByNormalizedPhoneNumberAndIdNot(normalizedPhone, contactId)) {
            throw new ResourceConflictException("PHONE_NUMBER_ALREADY_EXISTS: This phone number is already assigned to another station contact.");
        }

        contact.setPhoneNumber(request.phoneNumber().trim());
        contact.setNormalizedPhoneNumber(normalizedPhone);
        contact.setContactType(request.type());
        contact.setPriority(request.priority());
        contact.setPublicContact(request.publicContact());
        contact.setAvailable24Hour(request.available24Hour());
        contact.setUpdatedAt(LocalDateTime.now());

        contactRepository.save(contact);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "STATION_CONTACT_UPDATED", "STATION_CONTACT", contactId, station.getAgencyId(), "Updated contact " + contact.getPhoneNumber(), null, null);

        return stationMapper.toContactResponse(contact);
    }

    /**
     * Verifies a station contact number.
     * Enforces the verification hierarchy: the parent station MUST be verified before its contacts
     * can be verified. Attempts to verify a contact belonging to an unverified station return 409 CONFLICT.
     *
     * @param contactId the contact UUID
     * @return verified contact DTO
     * @throws ResourceConflictException if the parent station is unverified
     */
    @Transactional
    public StationContactResponse verifyStationContact(UUID contactId) {
        StationContactEntity contact = contactRepository.findById(contactId)
            .orElseThrow(() -> new ResourceNotFoundException("Station contact not found: " + contactId));

        StationEntity station = stationRepository.findById(contact.getStationId())
            .orElseThrow(() -> new ResourceNotFoundException("Station not found for contact: " + contactId));

        if (!station.isVerified()) {
            throw new ResourceConflictException("PARENT_STATION_NOT_VERIFIED: Verify the station before verifying its contacts.");
        }

        contact.setVerified(true);
        contact.setUpdatedAt(LocalDateTime.now());
        contactRepository.save(contact);

        UUID actorId = scopeService.getCurrentPrincipal().getId();
        auditService.logAction(actorId, "STATION_CONTACT_VERIFIED", "STATION_CONTACT", contactId, station.getAgencyId(), "Verified contact " + contact.getPhoneNumber(), null, null);

        return stationMapper.toContactResponse(contact);
    }
}
