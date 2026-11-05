-- Migration V47: Assign initial GNFS Agency Admin leadership priorities

UPDATE admin_user
SET priority_level = 1
WHERE LOWER(email) = 'nanagyachie@live.com';

UPDATE admin_user
SET priority_level = 2
WHERE LOWER(email) = 'nanagyachie1@gmail.com';
