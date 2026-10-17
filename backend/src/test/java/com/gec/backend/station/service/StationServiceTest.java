package com.gec.backend.station.service;

import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.reference.repository.DistrictRefRepository;
import com.gec.backend.reference.repository.RegionRefRepository;
import com.gec.backend.station.dto.StationContactResponse;
import com.gec.backend.station.dto.StationDetailsResponse;
import com.gec.backend.station.dto.StationResponse;
import com.gec.backend.station.entity.StationContactEntity;
import com.gec.backend.station.entity.StationContactType;
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
    private final StationMapper stationMapper = new StationMapper();
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

        List<StationResponse> result = stationService.getActiveVerifiedStationsByAgency(agencyId);

        assertEquals(1, result.size());
        assertEquals(stationId, result.get(0).id());
        assertEquals("DEV-FIRE-01", result.get(0).code());
    }

    @Test
    void getStationDetails_returnsStationWithContactsOrderedByPriority() {
        UUID stationId = UUID.randomUUID();
        UUID agencyId = UUID.randomUUID();
        StationEntity station = new StationEntity(stationId, agencyId, "Central Police Station", "DEV-POL-01", "Greater Accra", "Accra", "Kinbu", 5.5560, -0.1980, 12.0, true, true);

        StationContactEntity contact1 = new StationContactEntity(UUID.randomUUID(), stationId, "+233 30 000 0001", StationContactType.WATCHROOM, 1, true, true, true, true);
        StationContactEntity contact2 = new StationContactEntity(UUID.randomUUID(), stationId, "+233 30 000 0002", StationContactType.CONTROL_ROOM, 2, true, true, true, true);

        given(stationRepository.findById(stationId)).willReturn(Optional.of(station));
        given(contactRepository.findByStationIdOrderByPriorityAsc(stationId))
            .willReturn(List.of(contact1, contact2));

        StationDetailsResponse result = stationService.getStationDetails(stationId);

        assertNotNull(result);
        assertEquals(stationId, result.station().id());
        assertEquals(2, result.contacts().size());
        assertEquals(1, result.contacts().get(0).priority());
        assertEquals(2, result.contacts().get(1).priority());
    }

    @Test
    void getStationContacts_returnsContacts() {
        UUID stationId = UUID.randomUUID();
        UUID agencyId = UUID.randomUUID();
        StationEntity station = new StationEntity(stationId, agencyId, "Station 1", "ST-01", "Accra", "Accra", "Makola", 5.5, -0.2, 10.0, true, true);
        StationContactEntity contact = new StationContactEntity(UUID.randomUUID(), stationId, "+233 30 000 0001", StationContactType.WATCHROOM, 1, true, true, true, true);

        given(stationRepository.findById(stationId)).willReturn(Optional.of(station));
        given(contactRepository.findByStationIdOrderByPriorityAsc(stationId))
            .willReturn(List.of(contact));

        List<StationContactResponse> result = stationService.getStationContacts(stationId);

        assertEquals(1, result.size());
        assertEquals("+233 30 000 0001", result.get(0).phoneNumber());
    }
}
