package com.gec.backend.station.mapper;

import com.gec.backend.appliance.entity.ResponseApplianceEntity;
import com.gec.backend.appliance.repository.ResponseApplianceRepository;
import com.gec.backend.station.dto.StationContactResponse;
import com.gec.backend.station.dto.StationResponse;
import com.gec.backend.station.entity.StationContactEntity;
import com.gec.backend.station.entity.StationEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Station response readiness is derived from persisted active appliance
 * states at the station's current operational location.
 */
@Component
public class StationMapper {

    private final ResponseApplianceRepository applianceRepository;

    public StationMapper(ResponseApplianceRepository applianceRepository) {
        this.applianceRepository = applianceRepository;
    }

    public StationResponse toResponse(StationEntity entity) {
        if (entity == null) return null;

        List<ResponseApplianceEntity> appliances = applianceRepository
            .findByHomeStationIdOrCurrentStationId(entity.getId(), entity.getId())
            .stream()
            .filter(ResponseApplianceEntity::isActive)
            .filter(a -> entity.getId().equals(a.getEffectiveStationId()))
            .toList();

        long availableCount = appliances.stream().filter(a -> "AVAILABLE".equalsIgnoreCase(a.getOperationalStatus())).count();
        long atEmergencyCount = appliances.stream().filter(a -> {
            String st = a.getOperationalStatus().toUpperCase();
            return "DISPATCHED".equals(st) || "EN_ROUTE".equals(st) || "ON_SCENE".equals(st);
        }).count();
        long outOfCommissionCount = appliances.stream().filter(a -> "OUT_OF_COMMISSION".equalsIgnoreCase(a.getOperationalStatus())).count();
        long maintenanceCount = appliances.stream().filter(a -> "MAINTENANCE".equalsIgnoreCase(a.getOperationalStatus())).count();

        boolean available = appliances.isEmpty() || availableCount > 0;
        String primaryState = "AVAILABLE";
        if (!appliances.isEmpty() && availableCount == 0) {
            if (outOfCommissionCount > 0) {
                primaryState = "OUT_OF_COMMISSION";
            } else if (atEmergencyCount > 0) {
                primaryState = "RESPONDING";
            } else if (maintenanceCount > 0) {
                primaryState = "MAINTENANCE";
            } else {
                primaryState = "UNAVAILABLE";
            }
        }

        StationResponse.StationAvailabilityDto availability = new StationResponse.StationAvailabilityDto(
            available,
            availableCount,
            atEmergencyCount,
            outOfCommissionCount,
            maintenanceCount,
            primaryState,
            LocalDateTime.now().toString()
        );

        return new StationResponse(
            entity.getId(),
            entity.getAgencyId(),
            entity.getName(),
            entity.getCode(),
            entity.getStationLevel(),
            entity.getRegion(),
            entity.getDistrict(),
            entity.getRegionId(),
            entity.getDistrictId(),
            entity.getLocality(),
            entity.getLatitude(),
            entity.getLongitude(),
            entity.getLocationAccuracyMeters(),
            entity.isActive(),
            entity.isVerified(),
            availability
        );
    }

    public StationContactResponse toContactResponse(StationContactEntity entity) {
        if (entity == null) return null;
        return new StationContactResponse(
            entity.getId(),
            entity.getStationId(),
            entity.getPhoneNumber(),
            entity.getContactType(),
            entity.getPriority(),
            entity.isAvailable24Hour(),
            entity.isActive(),
            entity.isVerified()
        );
    }
}
