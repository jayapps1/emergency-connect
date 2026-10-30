package com.gec.backend.admin.service;

import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.agency.dto.AgencyResponse;
import com.gec.backend.agency.entity.AgencyEntity;
import com.gec.backend.agency.entity.AgencyType;
import com.gec.backend.agency.mapper.AgencyMapper;
import com.gec.backend.agency.repository.AgencyRepository;
import com.gec.backend.agency.service.AgencyService;
import com.gec.backend.appliance.repository.ResponseApplianceRepository;
import com.gec.backend.reference.repository.DistrictRefRepository;
import com.gec.backend.reference.repository.RegionRefRepository;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.mapper.StationMapper;
import com.gec.backend.station.repository.StationContactRepository;
import com.gec.backend.station.repository.StationRepository;
import com.gec.backend.station.service.StationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

class AdminAgencyStationWorkflowTest {

    private final AgencyRepository agencyRepository = Mockito.mock(AgencyRepository.class);
    private final AgencyMapper agencyMapper = new AgencyMapper();
    private final StationRepository stationRepository = Mockito.mock(StationRepository.class);
    private final StationContactRepository contactRepository = Mockito.mock(StationContactRepository.class);
    private final RegionRefRepository regionRefRepository = Mockito.mock(RegionRefRepository.class);
    private final DistrictRefRepository districtRefRepository = Mockito.mock(DistrictRefRepository.class);
    private final ResponseApplianceRepository applianceRepository = Mockito.mock(ResponseApplianceRepository.class);
    private final StationMapper stationMapper = new StationMapper(applianceRepository);
    private final AdminScopeService scopeService = Mockito.mock(AdminScopeService.class);
    private final AuditService auditService = Mockito.mock(AuditService.class);

    private final AgencyService agencyService = new AgencyService(
        agencyRepository, agencyMapper, scopeService, auditService
    );

    private final StationService stationService = new StationService(
        stationRepository, contactRepository, regionRefRepository, districtRefRepository, stationMapper, scopeService, auditService
    );

    @BeforeEach
    void setUp() {
        AdminUserEntity admin = new AdminUserEntity();
        admin.setId(UUID.randomUUID());
        admin.setEmail("admin@gec.gov.gh");
        AdminUserPrincipal principal = new AdminUserPrincipal(admin);
        given(scopeService.getCurrentPrincipal()).willReturn(principal);
    }

    @Test
    void stationFilteringWorkflow_returnsVerifiedActiveStations() {
        UUID agencyId = UUID.randomUUID();
        UUID stationId = UUID.randomUUID();
        StationEntity station = new StationEntity(
            stationId, agencyId, "HQ Fire Station", "GNFS-HQ-01", "Greater Accra", "Accra", "Makola", 5.55, -0.20, 10.0, true, true
        );

        given(stationRepository.findByAgencyIdAndActiveTrueAndVerifiedTrue(agencyId)).willReturn(List.of(station));

        var stations = stationService.getActiveVerifiedStationsByAgency(agencyId);

        assertNotNull(stations);
        assertEquals(1, stations.size());
        assertEquals("HQ Fire Station", stations.get(0).name());
    }
}
