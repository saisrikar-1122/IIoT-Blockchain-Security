# IIoT Sentinel — 50% Working Prototype

This reduced academic prototype intentionally has three working actions: generate a device identity, register a device on the local Hardhat blockchain, and submit sensor data as an on-chain transaction. Other dashboard sections and controls are static previews.

## Requirements
- Node.js 20+ and npm
- Python 3.11+ (Python 3.12 recommended)
- Windows PowerShell

## Run it (use three terminals)

### 1. Install and compile (project root)
```powershell
npm install
npm run compile
```

### 2. Start the local blockchain (Terminal 1, project root)
```powershell
npm run chain
```
Keep it running.

### 3. Deploy the contract (Terminal 2, project root)
```powershell
npm run deploy -- --network localhost
```
Copy the contract address printed by the command.

### 4. Configure and start the API (Terminal 2)
```powershell
Copy-Item .\python\.env.example .\python\.env
```
Edit `python/.env`: paste the deployed address after `CONTRACT_ADDRESS=`. The included administrator key is for the disposable local Hardhat chain only.
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\pythonequirements.txt
cd .\python
uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

### 5. Start the dashboard (Terminal 3, project root)
```powershell
cd .\dashboard
npm install
npm run dev
```
Open the Vite URL shown, normally `http://localhost:5173`.

## Demo order
1. In Devices, generate identity for `DEV001`.
2. Register `DEV001` on-chain.
3. In Sensor Operations, submit sensor data.
4. Confirm the transaction hash, block number and ledger entry.

Important: identity cache is in memory. Generate identity and register from the same running API session. Restarting Hardhat resets the local chain; compile and deploy again, then update the contract address. This is an educational local prototype, not production industrial security software. Never use the sample private key on a public network.
