-- Migration V27: Operational Response Appliance Entity, Status History, and Station Availability

-- 1. Create response_appliance table
CREATE TABLE IF NOT EXISTS response_appliance (
    id UUID PRIMARY KEY,
    agency_id UUID NOT NULL,
    home_station_id UUID NOT NULL,
    current_station_id UUID,
    resource_type VARCHAR(50) NOT NULL,
    call_sign VARCHAR(50) NOT NULL UNIQUE,
    registration_number VARCHAR(50),
    display_name VARCHAR(100) NOT NULL,
    operational_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    status_reason VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appliance_agency FOREIGN KEY (agency_id) REFERENCES agency(id) ON DELETE CASCADE,
    CONSTRAINT fk_appliance_home_station FOREIGN KEY (home_station_id) REFERENCES station(id) ON DELETE CASCADE,
    CONSTRAINT fk_appliance_current_station FOREIGN KEY (current_station_id) REFERENCES station(id) ON DELETE SET NULL
);

-- 2. Create response_appliance_status_history table
CREATE TABLE IF NOT EXISTS response_appliance_status_history (
    id UUID PRIMARY KEY,
    appliance_id UUID NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason VARCHAR(255),
    incident_id UUID,
    changed_by UUID,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appliance_history_appliance FOREIGN KEY (appliance_id) REFERENCES response_appliance(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appliance_agency ON response_appliance(agency_id);
CREATE INDEX IF NOT EXISTS idx_appliance_home_station ON response_appliance(home_station_id);
CREATE INDEX IF NOT EXISTS idx_appliance_current_station ON response_appliance(current_station_id);
CREATE INDEX IF NOT EXISTS idx_appliance_status ON response_appliance(operational_status);
CREATE INDEX IF NOT EXISTS idx_appliance_history_appliance ON response_appliance_status_history(appliance_id);
