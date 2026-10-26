# ⛓️ EduFocus AI — Blockchain Integrity & Audit Trail Guide

This document explains the **Blockchain Architecture**, **Smart Contract**, **Cryptographic Verification**, and **Live Demonstration Steps** implemented in EduFocus AI.

---

## 🎯 Purpose & Why Blockchain?

In educational technology, student focus analytics, productivity assessments, and AI-generated progress reports directly influence academic grading, parental interventions, and student records.

Traditional centralized databases suffer from a critical vulnerability: **any administrator, database breach, or unauthorized script can silently alter records without detection**.

EduFocus AI solves this problem by integrating an **EVM-compatible Solidity Smart Contract**:
1. Every finalized AI assessment generates a 256-bit cryptographic digest using the industry-standard **SHA-256** hashing algorithm.
2. The digest is immutably anchored to the smart contract along with its timestamp, block height, and transaction ID.
3. **Zero PII Exposure**: Student names, chat transcripts, and sensitive comments are **never** stored on the public blockchain—only mathematical hashes.
4. When parents or teachers review a report, the application recalculates the cryptographic hash in real time and compares it against the immutable blockchain anchor.
5. If even a single character in the report is altered, the cryptographic digest changes completely (**avalanche effect**), triggering an instant security alert.

---

## 📜 Solidity Smart Contract (`FocusReportAudit.sol`)

The smart contract is written in Solidity `^0.8.20` and deployed at `0x5FbDB2315678afecb367f032d93F642f64180aa3`.

### Key Functions
- `recordReport(uint256 reportId, bytes32 reportHash)`: Anchors a report digest. Emits a `ReportAnchored` EVM event.
- `verifyReport(uint256 reportId, bytes32 currentHash)`: Compares the submitted hash with the on-chain record and returns `(bool isAuthentic, bytes32 onChainHash, uint256 timestamp)`.
- `getReport(uint256 reportId)`: Retrieves blockchain metadata for a given report.

---

## 🧪 Running Smart Contract Unit Tests

The test suite validates contract deployment, report recording, tamper detection, duplicate protection, and input sanitization.

1. Navigate to the `blockchain` directory:
   ```bash
   cd EduFocus-AI-main/blockchain
   ```
2. Run the Hardhat test suite:
   ```bash
   npx hardhat test
   ```
3. Expected output:
   ```text
     FocusReportAudit Contract
       ✔ Should deploy successfully and set the deployer as owner
       ✔ Should record a new report hash and emit an event
       ✔ Should verify an untampered report successfully
       ✔ Should detect tampering when the report hash differs
       ✔ Should reject recording a report with a zero hash

     5 passing (2s)
   ```

---

## 🎬 Live Demonstration Walkthrough for Evaluators

EduFocus AI includes built-in demonstration controls right on the dashboard so anyone can see blockchain tamper detection in real time:

### Step 1: Open the Application
- Open [http://localhost:5173/parent](http://localhost:5173/parent) or [http://localhost:5173/teacher](http://localhost:5173/teacher).

### Step 2: Review the Blockchain Audit Trail
- Scroll to the **"Blockchain Audit Trail & Integrity Ledger"** panel.
- Notice:
  - **Network**: `Hardhat Devnet / Localhost (Solidity Compatible)`
  - **Smart Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
  - **Latest Block Height**: `Block #1004+`
  - **Anchored Reports**: All past focus reports with SHA-256 digests and transaction IDs.

### Step 3: Verify Cryptographic Authenticity
- Click **"Verify On-Chain"** on any report.
- An animated verification card appears with a green shield:
  > **VERIFIED: Cryptographic SHA-256 Matches Blockchain**  
  > *Report integrity verified! Cryptographic SHA-256 hash matches the immutable blockchain record. No modifications detected.*

### Step 4: Live Tamper Simulation (The "Aha!" Moment)
- Click **"Simulate Tamper"** next to the report.
- The system alters a record in the database and automatically triggers the blockchain integrity check.
- The UI immediately triggers a prominent red alert:
  > **SECURITY ALERT: Report Tampering Detected!**  
  > *The report content in the database does NOT match the immutable hash recorded on the blockchain.*  
  > *Smart Contract Hash: 0xf4578cf39a51...*  
  > *Current Computed Hash: 0x2a9f53bf6aba...*

### Step 5: Restore Authentic Data
- Click **"Restore"**.
- The system restores the authentic report content and re-verifies against the smart contract.
- The badge returns to green **VERIFIED** status.

---

## ⚡ Dual-Mode Blockchain Provider

EduFocus AI is architected with dual-mode operational resilience:
1. **Live EVM Mining Mode**: If a live Ethereum / Hardhat node is running (`npx hardhat node`), the backend connects via Web3 JSON-RPC on port `8545` and signs EVM transactions.
2. **Local Cryptographic Ledger Mode (Fallback)**: If a live node is not running, the backend transparently falls back to an internal cryptographic ledger that computes the exact same EVM SHA-256 keccak-compatible hashes, tracks blocks, and generates transaction hashes so the full audit trail works seamlessly out of the box.

To start a live Hardhat node anytime:
```bash
cd EduFocus-AI-main/blockchain
npx hardhat node
```
And deploy the contract:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
The backend automatically detects the active node and switches to live block mining!
