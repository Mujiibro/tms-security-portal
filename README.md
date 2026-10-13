# TMS Security Portal

A working replica of an ATM Terminal Management System (TMS) console, extended with **ML-based login anomaly detection** and **Wazuh SIEM integration**. Built as a hands-on security engineering project and deployed on both **Windows Server (IIS)** and **AWS (EC2 + RDS + Docker)**.

> Built by [Mujtaba Hussain Naqvi](https://github.com/Mujiibro), ATM Security Consultant and TMS Support Engineer, working towards a SOC Analyst role.

## Why this project

Production TMS platforms handle sensitive ATM operations, but their security telemetry is often an afterthought. This project shows how the authentication layer of such a platform can be designed, monitored and deployed end to end: secure login, behavioural anomaly scoring, structured audit logs, SIEM detection rules and cloud deployment.

## Features

- **Secure authentication:** JWT sessions, bcrypt password hashing, rate limiting, automatic account lockout (5 failed attempts, 15 minute lock)
- **ML anomaly detection:** a Python/FastAPI microservice scores every login with an unsupervised **Isolation Forest** on hour of day, success/failure, IP novelty and recent failure rate. If the ML service is down, login still works (fails safe)
- **Structured security logging:** every event is written to `tms_security.log` in a SIEM-friendly format:
  `<ISO timestamp> - <EventType> - User: <user> - IP: <ip> - <detail>`
  Event types: `Login_Success`, `Login_Failed`, `Account_Locked`, `Anomaly_Detected`
- **Wazuh detection rules:** custom rules for failed logins, ML anomalies, account lockouts and a brute-force frequency rule mapped to **MITRE ATT&CK T1110** (`wazuh/local_rules.xml`)
- **Management console:** React dashboard, Electronic Journal (EJ) view and a Security Anomalies page

## Architecture

```
Browser --> nginx / IIS (reverse proxy) --> Node/Express API --> SQL Server
                                                |
                                                +--> FastAPI ML service (Isolation Forest)
                                                |
                                                +--> tms_security.log --> Wazuh agent --> Wazuh manager (rules) --> alerts
```

| Layer | Technology |
|---|---|
| Frontend | React, Vite, react-router-dom |
| Backend | Node.js, Express, `mssql`, JWT, bcrypt |
| ML service | Python, FastAPI, scikit-learn (Isolation Forest) |
| Database | Microsoft SQL Server (local, or Amazon RDS SQL Server Express) |
| SIEM | Wazuh agent + manager, custom rules |
| Deployment | Windows Server (IIS URL Rewrite/ARR, NSSM services) and Docker Compose on AWS EC2 |

## Deployment targets

**Windows Server:** backend and ML service run as Windows services (NSSM), the React build is served by IIS with a reverse proxy rule for `/api/*`.

**AWS (ap-south-1):** custom VPC with public and private subnets, RDS SQL Server in a private subnet reachable only from the app's security group, Docker Compose (nginx, backend, ML service) on EC2, SSH port closed and access through SSM Session Manager.

> The AWS stack was torn down after testing to avoid ongoing cost. The repository contains everything needed to redeploy it.

## Repository layout

```
backend/        Express API, SQL Server data layer, security logger
ml-service/     FastAPI anomaly scoring service
frontend/       React/Vite console (nginx Dockerfile for container deployment)
wazuh/          Custom Wazuh rules and agent config snippet
docker-compose.yml
```

## Quick start (Docker Compose)

Prerequisites: Docker, Docker Compose, a reachable SQL Server database.

1. Create `backend/.env` (never commit it):

```
DB_SERVER=<sql-server-host>
DB_PORT=1433
DB_NAME=<database>
DB_USER=<user>
DB_PASSWORD=<password>
DB_ENCRYPT=true
JWT_SECRET=<long-random-string>
ML_SERVICE_URL=http://ml-service:8000
PORT=5000
```

2. Start the stack:

```
docker-compose up -d
```

3. Open `http://localhost` and check `http://localhost/api/health`.

On first start the backend creates its tables and seeds a demo admin user (see `backend/config/db.js`). **Change that password before exposing the app anywhere.**

## Quick start (local development)

```
cd ml-service && pip install -r requirements.txt && uvicorn main:app --port 8000
cd backend && npm install && npm start
cd frontend && npm install && npm run dev
```

## Security notes

- Secrets live in `.env` files and are excluded by `.gitignore`. Rotate any credential that has been shared or logged.
- The first login for any username is flagged as anomalous (no IP history yet). This is expected cold-start behaviour for this kind of detector.
- The ML model is trained on synthetic baseline traffic. In production it should be trained on real historical login data.

## Known limitations

- Wazuh custom rules are validated with `wazuh-logtest`. Live alerting from the Windows agent's streamed log events was not fully confirmed in my lab and is an open item.
- Secrets are read from `.env`. Moving them to a secrets store (for example AWS SSM Parameter Store) is planned.

## Roadmap

- Secrets in SSM Parameter Store, CloudWatch logging, least-privilege IAM
- HTTPS and a fixed public address
- Train the anomaly model on real login history
- Resolve live Wazuh alerting for streamed events

## What I learned

SQL Server recovery and permissions, IIS reverse proxying, Windows service management, Docker and Compose troubleshooting, AWS networking and security groups, and AWS cost awareness (Free Tier limits, burstable instance CPU credits). Detailed runbooks are in `docs/`.
