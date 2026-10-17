package com.gec.backend.admin.service;

import com.gec.backend.admin.dto.*;
import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.agency.dto.AgencyResponse;
import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.agency.mapper.AgencyMapper;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.agency.service.AgencyService;
import com.gec.backend.reference.repository.DistrictRefRepository;
import com.gec.backend.reference.repository.RegionRefRepository;
import com.gec.backend.station.dto.StationContactResponse;
import com.gec.backend.station.entity.StationContactType;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.mapper.StationMapper;
import com.gec.backend.station.repository.StationContactRepository;
import com.gec.backend.station.repository.StationRepository;
import com.gec.backend.station.service.StationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.BDDMockito.given;

class AdminAgencyStationWorkflowTest {

    private final AgencyRepository agencyRepository = Mockito.mock(AgencyRepository.class);
    private final AgencyMapper agencyMapper = new AgencyMapper();
    private final StationRepository stationRepository = Mockito.mock(StationRepository.class);
    private final StationContactRepository contactRepository = Mockito.mock(StationContactRepository.class);
    private final RegionRefRepository regionRefRepository = Mockito.mock(RegionRefRepository.class);
    private final DistrictRefRepository districtRefRepository = Mockito.mock(DistrictRefRepository.class);
    private final StationMapper stationMapper = new StationMapper();
    private final AdminScopeService scopeService = Mockito.mock(AdminScopeService.class);
    private final AuditService auditService = Mockito.mock(AuditService.class);

    private final AgencyService agencyService = new AgencyService(
        agencyRepository, agencyMapper, scopeService, auditService
    );

    private final StationService stationService = new StationService(
        stationRepository, contactRepository, regionRefRepository, districtRefRepository, stationMapper, scopeService, auditService
    );

    private final UUID agencyId = UUID.randomUUID();
    private final UUID stationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        AdminUserEntity admin = new AdminUserEntity();
        admin.setId(UUID.randomUUID());
        admin.setEmail("sysadmin@gec.gov.gh");
        admin.setPasswordHash("hash");
        admin.setActive(true);
        admin.setRoles(Set.of());

        AdminUserPrincipal principal = new AdminUserPrincipal(admin);
        given(scopeService.getCurrentPrincipal()).willReturn(principal);
    }

    @Test
    void createAgency_createsUnverifiedAgency() {
        CreateAgencyRequest request = new CreateAgencyRequest("Ghana Police Service", "GPS", AgencyType.POLICE, "191");

        AgencyResponse response = agencyService.createAgency(request);

        assertNotNull(response);
        assertEquals("Ghana Police Service", response.name());
        assertEquals("GPS", response.code());
        assertFalse(response.verified());
        assertTrue(response.active());
    }

    @Test
    void createStationContact_addsContactWithPriority() {
        StationEntity station = new StationEntity(
            stationId, agencyId, "GPS HQ Station", "GPS-ACC-01", "Greater Accra", "Accra", "Central", 5.55, -0.2, 10.0, true, true
        );
        given(stationRepository.findById(stationId)).willReturn(Optional.of(station));

        CreateStationContactRequest request = new CreateStationContactRequest(
            "+233302111222", StationContactType.CONTROL_ROOM, 1, true, true
        );

        StationContactResponse response = stationService.createStationContact(stationId, request);

        assertNotNull(response);
        assertEquals("+233302111222", response.phoneNumber());
        assertEquals(StationContactType.CONTROL_ROOM, response.type());
        assertEquals(1, response.priority());
        assertTrue(response.is24Hour());
    }
}
