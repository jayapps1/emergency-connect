package com.gec.backend.admin.controller;

import com.gec.backend.admin.dto.*;
import com.gec.backend.station.dto.StationContactResponse;
import com.gec.backend.station.dto.StationDetailsResponse;
import com.gec.backend.station.dto.StationResponse;
import com.gec.backend.station.service.StationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller providing RBAC-protected administrative endpoints for managing emergency stations,
 * administrative levels, coordinates, verification statuses, and contact numbers.
 *
 * <p>Access Control & Security:
 * <ul>
 *   <li>All endpoints require valid JWT authentication and specific fine-grained authorities
 *       (e.g., {@code STATION_READ}, {@code STATION_CREATE}, {@code STATION_VERIFY}).</li>
 *   <li>Resource visibility and modifications are automatically restricted to the principal's
 *       agency and station scope via {@link com.gec.backend.admin.security.AdminScopeService}.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/admin/stations")
public class AdminStationController {

    private final StationService stationService;

    public AdminStationController(StationService stationService) {
        this.stationService = stationService;
    }

    /**
     * Retrieves paginated station records scoped to the authenticated administrator.
     *
     * @param pageable pagination and sorting parameters
     * @return paginated station records
     */
    @GetMapping
    @PreAuthorize("hasAuthority('STATION_READ')")
    public ResponseEntity<Page<StationResponse>> getAdminStations(Pageable pageable) {
        return ResponseEntity.ok(stationService.getAdminStations(pageable));
    }

    /**
     * Searches administrative stations by name or station code.
     *
     * @param q query string fragment
     * @return list of matching station DTOs
     */
    @GetMapping("/search")
    @PreAuthorize("hasAuthority('STATION_READ')")
    public ResponseEntity<List<StationResponse>> searchStations(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(stationService.searchStations(q));
    }

    /**
     * Retrieves details and all contacts (public and internal) for a specific station.
     *
     * @param stationId target station UUID
     * @return station details response
     */
    @GetMapping("/{stationId}")
    @PreAuthorize("hasAuthority('STATION_READ')")
    public ResponseEntity<StationDetailsResponse> getStationDetails(@PathVariable UUID stationId) {
        return ResponseEntity.ok(stationService.getStationDetails(stationId));
    }

    /**
     * Creates a new emergency station under an agency.
     *
     * @param request station creation payload
     * @return created station DTO with HTTP 201 Created
     */
    @PostMapping
    @PreAuthorize("hasAuthority('STATION_CREATE')")
    public ResponseEntity<StationResponse> createStation(@Valid @RequestBody CreateStationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stationService.createStation(request));
    }

    /**
     * Updates an existing station's name, region, district, locality, and coordinates.
     *
     * @param stationId target station UUID
     * @param request update payload
     * @return updated station DTO
     */
    @PutMapping("/{stationId}")
    @PreAuthorize("hasAuthority('STATION_UPDATE')")
    public ResponseEntity<StationResponse> updateStation(
        @PathVariable UUID stationId,
        @Valid @RequestBody UpdateStationRequest request
    ) {
        return ResponseEntity.ok(stationService.updateStation(stationId, request));
    }

    /**
     * Verifies a station, approving it for public publication.
     *
     * @param stationId target station UUID
     * @return verified station DTO
     */
    @PatchMapping("/{stationId}/verify")
    @PreAuthorize("hasAuthority('STATION_VERIFY')")
    public ResponseEntity<StationResponse> verifyStation(@PathVariable UUID stationId) {
        return ResponseEntity.ok(stationService.verifyStation(stationId));
    }

    /**
     * Toggles a station's active/inactive status.
     *
     * @param stationId target station UUID
     * @return updated station DTO
     */
    @PatchMapping("/{stationId}/status")
    @PreAuthorize("hasAuthority('STATION_UPDATE')")
    public ResponseEntity<StationResponse> toggleStationStatus(@PathVariable UUID stationId) {
        return ResponseEntity.ok(stationService.toggleStationStatus(stationId));
    }

    /**
     * Retrieves all contact numbers associated with a station.
     *
     * @param stationId target station UUID
     * @return list of station contact DTOs
     */
    @GetMapping("/{stationId}/contacts")
    @PreAuthorize("hasAuthority('STATION_CONTACT_READ')")
    public ResponseEntity<List<StationContactResponse>> getStationContacts(@PathVariable UUID stationId) {
        return ResponseEntity.ok(stationService.getStationContacts(stationId));
    }

    /**
     * Adds a new contact number to a station. Enforces priority and phone uniqueness.
     *
     * @param stationId target station UUID
     * @param request contact creation payload
     * @return created contact DTO with HTTP 201 Created
     */
    @PostMapping("/{stationId}/contacts")
    @PreAuthorize("hasAuthority('STATION_CONTACT_CREATE')")
    public ResponseEntity<StationContactResponse> createStationContact(
        @PathVariable UUID stationId,
        @Valid @RequestBody CreateStationContactRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stationService.createStationContact(stationId, request));
    }

    /**
     * Updates an existing station contact number, priority, or visibility.
     *
     * @param contactId target contact UUID
     * @param request contact update payload
     * @return updated contact DTO
     */
    @PutMapping("/contacts/{contactId}")
    @PreAuthorize("hasAuthority('STATION_CONTACT_UPDATE')")
    public ResponseEntity<StationContactResponse> updateStationContact(
        @PathVariable UUID contactId,
        @Valid @RequestBody UpdateStationContactRequest request
    ) {
        return ResponseEntity.ok(stationService.updateStationContact(contactId, request));
    }

    /**
     * Verifies a station contact number.
     * Enforces the verification hierarchy: parent station MUST be verified before contact verification is allowed.
     *
     * @param contactId target contact UUID
     * @return verified contact DTO
     */
    @PatchMapping("/contacts/{contactId}/verify")
    @PreAuthorize("hasAuthority('STATION_CONTACT_VERIFY')")
    public ResponseEntity<StationContactResponse> verifyStationContact(@PathVariable UUID contactId) {
        return ResponseEntity.ok(stationService.verifyStationContact(contactId));
    }
}
