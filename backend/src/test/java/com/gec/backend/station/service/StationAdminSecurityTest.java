package com.gec.backend.station.service;

import com.gec.backend.admin.entity.AdminUserEntity;
import com.gec.backend.admin.security.AdminScopeService;
import com.gec.backend.admin.security.AdminUserPrincipal;
import com.gec.backend.admin.service.AuditService;
import com.gec.backend.reference.repository.DistrictRefRepository;
import com.gec.backend.reference.repository.RegionRefRepository;
import com.gec.backend.station.dto.StationResponse;
import com.gec.backend.station.entity.StationEntity;
import com.gec.backend.station.mapper.StationMapper;
import com.gec.backend.station.repository.StationContactRepository;
import com.gec.backend.station.repository.StationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.BDDMockito.given;

class StationAdminSecurityTest {

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

    private final UUID agencyId = UUID.randomUUID();
    private final UUID stationId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        AdminUserEntity admin = new AdminUserEntity();
        admin.setId(userId);
        admin.setEmail("stationadmin@gnfs.gov.gh");
        admin.setAgencyId(agencyId);
        admin.setStationId(stationId);
        admin.setRoles(Set.of());

        AdminUserPrincipal principal = new AdminUserPrincipal(admin);
        given(scopeService.getCurrentPrincipal()).willReturn(principal);
        given(scopeService.isSystemAdmin()).willReturn(false);
    }

    @Test
    void getActiveVerifiedStationsByAgency_returnsActiveStations() {
        StationEntity station = new StationEntity(
            stationId, agencyId, "Makola Fire Station", "GNFS-MAK-01", "Greater Accra", "Accra Metropolitan", "Makola", 5.55, -0.20, 10.0, true, true
        );
        given(stationRepository.findByAgencyIdAndActiveTrueAndVerifiedTrue(agencyId)).willReturn(List.of(station));

        List<StationResponse> stations = stationService.getActiveVerifiedStationsByAgency(agencyId);

        assertNotNull(stations);
        assertEquals(1, stations.size());
        assertEquals("GNFS-MAK-01", stations.get(0).code());
    }
}
