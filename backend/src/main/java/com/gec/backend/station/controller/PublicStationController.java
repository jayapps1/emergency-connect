package com.gec.backend.station.controller;

import com.gec.backend.station.dto.StationContactResponse;
import com.gec.backend.station.dto.StationDetailsResponse;
import com.gec.backend.station.service.StationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

/**
 * Unauthenticated public REST controller serving published emergency station and contact information
 * to mobile Android clients and web visitors.
 *
 * <p>Publication Privacy & Security Rules:
 * <ul>
 *   <li><b>Station Eligibility:</b> Returns ONLY stations where {@code active = true} AND {@code verified = true}.</li>
 *   <li><b>Contact Eligibility:</b> Returns ONLY contacts where {@code public_contact = true}, {@code active = true},
 *       {@code verified = true}, AND the parent station is both active and verified.</li>
 *   <li><b>Internal Contacts:</b> Internal, unverified, or inactive administrative numbers are strictly excluded.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/public/stations")
public class PublicStationController {

    private final StationService stationService;

    public PublicStationController(StationService stationService) {
        this.stationService = stationService;
    }

    /**
     * Retrieves all published Regional Headquarters (RHQ) stations and their public contacts
     * for offline directory caching across Android clients.
     *
     * @return list of published RHQ station details
     */
    @GetMapping("/headquarters")
    public ResponseEntity<List<StationDetailsResponse>> getPublicHeadquarters() {
        return ResponseEntity.ok(stationService.getPublicHeadquarters());
    }

    /**
     * Retrieves the published Regional Headquarters (RHQ) for a specific agency and region.
     *
     * @param agencyId agency UUID
     * @param regionId region UUID
     * @return published RHQ station details
     */
    @GetMapping("/headquarters/agencies/{agencyId}/regions/{regionId}")
    public ResponseEntity<StationDetailsResponse> getPublicRegionalHeadquarters(
        @PathVariable UUID agencyId,
        @PathVariable UUID regionId
    ) {
        return ResponseEntity.ok(stationService.getPublicRegionalHeadquarters(agencyId, regionId));
    }

    /**
     * Retrieves public details for a single published station.
     *
     * @param stationId station UUID
     * @return published station details and public contacts
     */
    @GetMapping("/{stationId}")
    public ResponseEntity<StationDetailsResponse> getStationDetails(@PathVariable UUID stationId) {
        return ResponseEntity.ok(stationService.getPublicStationDetails(stationId));
    }

    /**
     * Retrieves public contacts for a published station.
     *
     * @param stationId station UUID
     * @return list of public verified contact DTOs
     */
    @GetMapping("/{stationId}/contacts")
    public ResponseEntity<List<StationContactResponse>> getStationContacts(@PathVariable UUID stationId) {
        return ResponseEntity.ok(stationService.getPublicStationContacts(stationId));
    }
}
