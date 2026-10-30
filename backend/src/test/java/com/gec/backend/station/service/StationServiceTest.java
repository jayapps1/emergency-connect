package com.gec.backend.station.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.appliance.repository.ResponseApplianceRepository;
import com.gec.backend.reference.repository.DistrictRefRepository;
import com.gec.backend.reference.repository.RegionRefRepository;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.mapper.StationMapper;
import com.gec.backend.station.repository.StationContactRepository;
import com.gec.backend.station.repository.StationRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.BDDMockito.given;

class StationServiceTest {

    private final StationRepository stationRepository = Mockito.mock(StationRepository.class);
    private final StationContactRepository contactRepository = Mockito.mock(StationContactRepository.class);
    private final RegionRefRepository regionRefRepository = Mockito.mock(RegionRefRepository.class);
    private final DistrictRefRepository districtRefRepository = Mockito.mock(DistrictRefRepository.class);
    private final ResponseApplianceRepository applianceRepository = Mockito.mock(ResponseApplianceRepository.class);
    private final StationMapper stationMapper = new StationMapper(applianceRepository);
    private final AdminScopeService scopeService = Mockito.mock(AdminScopeService.class);
    private final AuditService auditService = Mockito.mock(AuditService.class);

    private final StationService stationService = new StationService(
        stationRepository, contactRepository, regionRefRepository, districtRefRepository, stationMapper, scopeService, auditService
    );

    @Test
    void getActiveVerifiedStationsByAgency_returnsStations() {
        UUID agencyId = UUID.randomUUID();
        UUID stationId = UUID.randomUUID();
        StationEntity station = new StationEntity(stationId, agencyId, "Fire HQ Station", "DEV-FIRE-01", "Greater Accra", "Accra", "Makola", 5.5500, -0.2000, 10.0, true, true);

        given(stationRepository.findByAgencyIdAndActiveTrueAndVerifiedTrue(agencyId)).willReturn(List.of(station));

        var result = stationService.getActiveVerifiedStationsByAgency(agencyId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Fire HQ Station", result.get(0).name());
    }

    @Test
    void getPublicStationDetails_returnsStationDetails() {
        UUID stationId = UUID.randomUUID();
        UUID agencyId = UUID.randomUUID();
        StationEntity station = new StationEntity(stationId, agencyId, "Fire Station Detail", "DEV-FIRE-02", "Ashanti", "Kumasi", "Central", 6.6900, -1.6200, 10.0, true, true);

        given(stationRepository.findByIdAndActiveTrueAndVerifiedTrue(stationId)).willReturn(Optional.of(station));
        given(contactRepository.findByStationIdAndPublicContactTrueAndActiveTrueAndVerifiedTrueOrderByPriorityAsc(stationId)).willReturn(List.of());

        var result = stationService.getPublicStationDetails(stationId);

        assertNotNull(result);
        assertEquals("Fire Station Detail", result.station().name());
    }
}
