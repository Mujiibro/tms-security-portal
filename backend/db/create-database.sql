-- =============================================================
-- Run this ONCE in SSMS, connected as a sysadmin login (e.g. sa
-- or your Windows account if it has sysadmin rights).
--
-- Before running: make sure the SQL Server instance has
-- "SQL Server and Windows Authentication mode" enabled —
-- in SSMS: right-click the server > Properties > Security >
-- Server authentication > "SQL Server and Windows Authentication
-- mode" > OK > then restart the SQL Server service.
-- (If it's already in mixed mode, skip that step.)
-- =============================================================

-- 1. Create the database (backend/config/db.js creates the tables
--    inside it automatically on first run — you don't need to
--    create tables here).
IF DB_ID('TMSReplica') IS NULL
    CREATE DATABASE TMSReplica;
GO

USE TMSReplica;
GO

-- 2. Create a dedicated SQL login for the app.
--    CHANGE THIS PASSWORD, and match it in backend/.env (DB_PASSWORD).
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'tms_app')
BEGIN
    CREATE LOGIN tms_app WITH PASSWORD = 'ChangeThisPassword!123';
END
GO

-- 3. Map that login to a user inside TMSReplica with permission
--    to create/read/write tables.
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'tms_app')
BEGIN
    CREATE USER tms_app FOR LOGIN tms_app;
    ALTER ROLE db_owner ADD MEMBER tms_app;
END
GO

PRINT 'Done. Database TMSReplica and login tms_app are ready.';
PRINT 'Set DB_USER=tms_app and DB_PASSWORD=<your password> in backend/.env';
