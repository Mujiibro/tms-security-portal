/**
 * db.js — SQL Server data layer
 *
 * Uses SQL Server (Microsoft's `mssql` driver) so this matches your existing
 * production stack (SQL Server 2022 already on the box, per your TMS setup).
 *
 * Auth: SQL Server authentication (username/password), not Windows Auth —
 * this avoids needing the native msnodesqlv8 driver (which requires
 * node-gyp/Visual Studio Build Tools to compile on Windows). Create a SQL
 * login for the app using db/create-database.sql (run once in SSMS), and
 * make sure the SQL Server instance has "SQL Server and Windows
 * Authentication mode" enabled (Server Properties > Security in SSMS).
 *
 * Connection settings come from environment variables — see .env.example.
 */
const sql = require("mssql");
const bcrypt = require("bcryptjs");

const config = {
  server: process.env.DB_SERVER || "localhost",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433,
  database: process.env.DB_NAME || "TMSReplica",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true", // true if connecting to Azure SQL
    trustServerCertificate: true, // fine for local/on-prem SQL Server with a self-signed cert
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise = null;

async function initSchema(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.users', 'U') IS NULL
    CREATE TABLE dbo.users (
      id INT IDENTITY(1,1) PRIMARY KEY,
      username NVARCHAR(100) UNIQUE NOT NULL,
      password_hash NVARCHAR(255) NOT NULL,
      role NVARCHAR(50) DEFAULT 'operator',
      failed_attempts INT DEFAULT 0,
      locked_until DATETIME2 NULL,
      created_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
  `);

  await pool.request().query(`
    IF OBJECT_ID('dbo.login_events', 'U') IS NULL
    CREATE TABLE dbo.login_events (
      id INT IDENTITY(1,1) PRIMARY KEY,
      username NVARCHAR(100) NOT NULL,
      ip_address NVARCHAR(50) NOT NULL,
      success BIT NOT NULL,
      hour_of_day INT NOT NULL,
      anomaly_score FLOAT NULL,
      is_anomaly BIT DEFAULT 0,
      created_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
  `);

  await pool.request().query(`
    IF OBJECT_ID('dbo.ej_records', 'U') IS NULL
    CREATE TABLE dbo.ej_records (
      id INT IDENTITY(1,1) PRIMARY KEY,
      terminal_id NVARCHAR(50) NOT NULL,
      task_name NVARCHAR(200) NOT NULL,
      start_date DATETIME2 NOT NULL,
      end_date DATETIME2 NULL,
      status NVARCHAR(20) NOT NULL,
      file_path NVARCHAR(500) NULL
    );
  `);
}

async function seedIfEmpty(pool) {
  const userCount = await pool.request().query("SELECT COUNT(*) AS c FROM dbo.users");
  if (userCount.recordset[0].c > 0) return;

  const hash = bcrypt.hashSync("Admin@123", 10);
  await pool
    .request()
    .input("username", sql.NVarChar, "admin")
    .input("hash", sql.NVarChar, hash)
    .input("role", sql.NVarChar, "administrator")
    .query("INSERT INTO dbo.users (username, password_hash, role) VALUES (@username, @hash, @role)");
  console.log("[db] Seeded default user -> username: admin / password: Admin@123");

  const seedEJ = [
    ["ATM-KHI-001", "Cash Replenishment Sync", "2026-09-17T06:00:00", "2026-09-17T06:04:12", "Success", "\\\\TMS01\\EJ\\ATM-KHI-001\\20260917.log"],
    ["ATM-LHR-014", "Journal Upload", "2026-09-17T06:05:00", "2026-09-17T06:05:44", "Success", "\\\\TMS01\\EJ\\ATM-LHR-014\\20260917.log"],
    ["ATM-KHI-009", "Journal Upload", "2026-09-17T06:07:00", null, "Warning", "\\\\TMS01\\EJ\\ATM-KHI-009\\20260917.log"],
  ];
  for (const [terminal_id, task_name, start_date, end_date, status, file_path] of seedEJ) {
    await pool
      .request()
      .input("terminal_id", sql.NVarChar, terminal_id)
      .input("task_name", sql.NVarChar, task_name)
      .input("start_date", sql.DateTime2, new Date(start_date))
      .input("end_date", sql.DateTime2, end_date ? new Date(end_date) : null)
      .input("status", sql.NVarChar, status)
      .input("file_path", sql.NVarChar, file_path)
      .query(
        `INSERT INTO dbo.ej_records (terminal_id, task_name, start_date, end_date, status, file_path)
         VALUES (@terminal_id, @task_name, @start_date, @end_date, @status, @file_path)`
      );
  }
}

/**
 * Returns a connected, schema-initialized, seeded connection pool.
 * Safe to call from every route — the connection + setup only happens once.
 */
async function getPool() {
  if (!poolPromise) {
    poolPromise = sql
      .connect(config)
      .then(async (pool) => {
        await initSchema(pool);
        await seedIfEmpty(pool);
        console.log(`[db] Connected to SQL Server: ${config.server}:${config.port} / ${config.database}`);
        return pool;
      })
      .catch((err) => {
        poolPromise = null; // allow retry on next call instead of caching a dead connection
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { getPool, sql };
