require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { getPool } = require("./config/db");

const authRoutes = require("./routes/auth");
const ejRoutes = require("./routes/ej");
const anomalyRoutes = require("./routes/anomaly");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/ej", ejRoutes);
app.use("/api/anomaly", anomalyRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

async function start() {
  try {
    await getPool(); // connect to SQL Server, create schema if needed, seed demo data
  } catch (err) {
    console.error("[server] Could not connect to SQL Server:", err.message);
    console.error("[server] Check DB_SERVER/DB_NAME/DB_USER/DB_PASSWORD in your .env file, and that SQL Server allows SQL authentication.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`TMS backend running on http://localhost:${PORT}`);
    console.log(`Security log: ${path.join(__dirname, "logs", "tms_security.log")}`);
  });
}

start();
