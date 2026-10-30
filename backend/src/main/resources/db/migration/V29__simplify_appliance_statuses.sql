-- Migration V29: Simplify appliance operational statuses to AVAILABLE, DISPATCHED, OUT_OF_COMMISSION, MAINTENANCE

UPDATE response_appliance
SET operational_status = 'DISPATCHED'
WHERE UPPER(operational_status) IN ('EN_ROUTE', 'ON_SCENE', 'RETURNING');

UPDATE response_appliance
SET operational_status = 'OUT_OF_COMMISSION'
WHERE UPPER(operational_status) = 'TEMPORARILY_UNAVAILABLE';

UPDATE response_appliance_status_history
SET new_status = 'DISPATCHED'
WHERE UPPER(new_status) IN ('EN_ROUTE', 'ON_SCENE', 'RETURNING');

UPDATE response_appliance_status_history
SET new_status = 'OUT_OF_COMMISSION'
WHERE UPPER(new_status) = 'TEMPORARILY_UNAVAILABLE';
