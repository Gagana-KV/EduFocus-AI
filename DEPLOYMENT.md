# ☁️ EduFocus AI — Cloud Computing & Deployment Guide

This guide details how to deploy **EduFocus AI** across cloud platforms (Docker, Render, Railway, AWS ECS, Google Cloud Run, and VPS).

---

## 🏗️ Architecture Overview

EduFocus AI is architected as a cloud-ready, decoupled web application:

```
                      ┌──────────────────────────────────────┐
                      │          Students & Parents          │
                      │               Browsers               │
                      └──────────────────┬───────────────────┘
                                         │  HTTPS / Port 443
                                         ▼
                      ┌──────────────────────────────────────┐
                      │        Frontend (React + Vite)       │
                      │         Nginx Web Container          │
                      │           Port 80 / 3000             │
                      └──────────────────┬───────────────────┘
                                         │  REST / JSON (VITE_API_BASE_URL)
                                         ▼
                      ┌──────────────────────────────────────┐
                      │         FastAPI Backend Server       │
                      │        Uvicorn ASGI Engine           │
                      │             Port 8000                │
                      └───┬──────────────────────────────┬───┘
                          │                              │
          SQL Queries &   │                              │  Web3 JSON-RPC
          Focus History   ▼                              ▼  SHA-256 Anchor
       ┌─────────────────────┐               ┌────────────────────────┐
       │   SQLite Database   │               │ Solidity Smart Contract│
       │  Persistent Volume  │               │ FocusReportAudit (EVM) │
       │  /app/data/edufocus │               │  Hardhat / Sepolia /   │
       └─────────────────────┘               │  Polygon Testnet       │
                                             └────────────────────────┘
```

---

## 🔑 Environment Variables Reference

| Variable | Scope | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `GROQ_API_KEY` | Backend | Groq Cloud API Key for Llama 3 AI chatbot and report generation | `gsk_...` |
| `DATABASE_PATH` | Backend | Path to SQLite database file (supports cloud persistent volumes) | `/app/data/edufocus.db` |
| `PORT` | Backend | HTTP server port | `8000` |
| `VITE_API_BASE_URL`| Frontend | Public URL of the FastAPI backend API | `http://localhost:8000/api` |
| `BLOCKCHAIN_PROVIDER_URL` | Backend | Web3 RPC endpoint (Infura, Alchemy, or Hardhat node) | `http://127.0.0.1:8545` |
| `CONTRACT_ADDRESS` | Backend | Deployed `FocusReportAudit` smart contract address | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `BLOCKCHAIN_PRIVATE_KEY` | Backend | Optional EVM account private key for signing on-chain transactions | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |

---

## 🚀 Deployment Option 1: Docker Compose (Single-Server / VPS / Local Cloud)

Docker Compose provides a complete, isolated multi-container setup with persistent database volume.

### Prerequisites
- Docker Engine 24+ and Docker Compose v2+ installed.

### Steps
1. Navigate to the project root:
   ```bash
   cd EduFocus-AI-main
   ```
2. Ensure your `backend/.env` file contains your `GROQ_API_KEY`.
3. Launch the container cluster:
   ```bash
   docker compose up -d --build
   ```
4. Verify running containers:
   ```bash
   docker compose ps
   ```
5. Access the application:
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Blockchain Node Health**: [http://localhost:8000/api/blockchain/status](http://localhost:8000/api/blockchain/status)

6. Stop containers:
   ```bash
   docker compose down
   ```
   *(Note: SQLite data is preserved in the `edufocus-db-data` volume).*

---

## 🌐 Deployment Option 2: Render.com / Railway.app (Serverless PaaS)

Both Render and Railway support native Docker deployment from a GitHub repository.

### Backend Deployment (FastAPI)
1. Create a new **Web Service** on Render or Railway.
2. Link your repository.
3. Configure:
   - **Root Directory**: `EduFocus-AI-main/backend`
   - **Environment**: `Docker` (or `Python 3`)
   - **Docker Build Context**: `.`
   - **Docker File**: `Dockerfile`
4. Add **Environment Variables**:
   - `GROQ_API_KEY`: *(your Groq API key)*
   - `DATABASE_PATH`: `/app/data/edufocus.db`
5. Attach a **Persistent Disk** (Render: 1GB at `/app/data`) so user accounts and focus events persist.
6. Copy your generated public backend URL (e.g., `https://edufocus-backend.onrender.com`).

### Frontend Deployment (React + Vite)
1. Create a new **Static Site** on Render or Vercel.
2. Link repository:
   - **Root Directory**: `EduFocus-AI-main/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Add **Environment Variable**:
   - `VITE_API_BASE_URL`: `https://edufocus-backend.onrender.com/api`
4. Deploy! Your EduFocus AI instance is now accessible worldwide.

---

## ☁️ Deployment Option 3: AWS (ECS Fargate + CloudFront)

For enterprise-scale production:
1. **Container Registry**: Push backend and frontend images to **Amazon ECR**:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com
   docker tag edufocus-backend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/edufocus-backend:latest
   docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/edufocus-backend:latest
   ```
2. **Storage**: Create an **Amazon EFS** (Elastic File System) volume and mount it to `/app/data` in the ECS Task Definition for database persistence.
3. **Compute**: Run task on **AWS ECS Fargate** with an Application Load Balancer (ALB) handling HTTPS with ACM SSL certificates.
4. **CDN**: Distribute frontend static files globally via **Amazon CloudFront + S3**.

---

## 🛡️ Production Security Checklist

- [x] **Privacy Preservation**: No student PII or messages are ever published to the blockchain—only SHA-256 cryptographic digests.
- [x] **CORS Configuration**: In `backend/main.py`, update `allow_origins=["*"]` to your exact frontend domain for production.
- [x] **Persistent Storage**: Always mount a persistent volume at `/app/data` to preserve database states across container deployments.
- [x] **API Key Confidentiality**: Ensure `.env` is listed in `.gitignore` and never committed to source control.
