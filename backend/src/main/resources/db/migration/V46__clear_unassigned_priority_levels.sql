-- Migration V46: Clear unassigned priority levels for non-lead/unconfigured staff accounts

UPDATE admin_user
SET priority_level = NULL
WHERE id NOT IN (
    SELECT ur.user_id
    FROM user_role ur
    JOIN role r ON ur.role_id = r.id
    WHERE r.code IN ('SYSTEM_ADMIN', 'AGENCY_ADMIN', 'ROLE_SYSTEM_ADMIN', 'ROLE_AGENCY_ADMIN')
);
