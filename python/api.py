
import json
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from blockchain import BlockchainService
from security import generate_identity, payload_hash


app = FastAPI(title="IIoT Blockchain Security Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

chain = BlockchainService()
identities, events = {}, []

# Store original sensor readings off-chain, indexed by SHA-256 hash.
SENSOR_RECORDS_FILE = Path(__file__).resolve().parent / "sensor_records.json"

try:
    sensor_records = json.loads(
        SENSOR_RECORDS_FILE.read_text(encoding="utf-8")
    )
    if not isinstance(sensor_records, dict):
        sensor_records = {}
except (FileNotFoundError, json.JSONDecodeError):
    sensor_records = {}


def save_sensor_records():
    SENSOR_RECORDS_FILE.write_text(
        json.dumps(sensor_records, indent=2),
        encoding="utf-8",
    )


class DeviceInput(BaseModel):
    deviceId: str = Field(
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9_-]+$",
    )


class SensorInput(DeviceInput):
    temperature: float = Field(ge=-100, le=300)
    humidity: float = Field(ge=0, le=100)


@app.get("/")
def home():
    return {
        "message": "IIoT Blockchain Security API",
        "docs": "/docs",
    }


@app.get("/blockchain/status")
def status():
    try:
        return chain.status()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/dashboard")
def dashboard():
    try:
        return {
            "blockchain": chain.status(),
            "recentTransactions": chain.transactions(20),
            "recentEvents": events[:20],
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/blockchain/transactions")
def transactions(limit: int = 30):
    try:
        rows = chain.transactions(min(max(limit, 1), 100))

        for row in rows:
            digest = str(row.get("payloadHash", "")).lower()
            digest = digest.removeprefix("0x")
            row["sensorData"] = sensor_records.get(digest)

        return {"transactions": rows}

    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/devices/identity")
def identity(req: DeviceInput):
    try:
        item = generate_identity(req.deviceId)
        identities[req.deviceId] = item

        return {
            "deviceId": req.deviceId,
            "fingerprint": item["fingerprint"],
            "publicKey": item["publicKey"],
            "message": "Device identity generated.",
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/devices/register")
def register(req: DeviceInput):
    try:
        item = identities.get(req.deviceId)

        if item is None:
            item = generate_identity(req.deviceId)
            identities[req.deviceId] = item

        result = chain.register(req.deviceId, item["fingerprint"])

        events.insert(0, {
            "time": datetime.now(timezone.utc).isoformat(),
            "type": "DEVICE_REGISTERED",
            "deviceId": req.deviceId,
            "onChain": True,
        })

        return {
            "message": "Device registered on blockchain.",
            "fingerprint": item["fingerprint"],
            "blockchain": result,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/data/send")
def send_data(req: SensorInput):
    try:
        device = chain.device(req.deviceId)

        if not device["registered"]:
            raise ValueError(
                "Generate identity and register this device first."
            )

        if not device["authorized"]:
            raise ValueError("Device is not authorized.")

        if req.deviceId not in identities:
            raise ValueError(
                "Generate this device identity in this API session first."
            )

        payload = {
            "deviceId": req.deviceId,
            "temperature": req.temperature,
            "humidity": req.humidity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Generate a SHA-256 hash of the submitted sensor payload.
        digest = payload_hash(payload)
        record_key = str(digest).lower().removeprefix("0x")

        # Record the hash and metadata on the blockchain.
        result = chain.record(req.deviceId, digest)

        # Save the original readings locally using the same hash as the key.
        sensor_records[record_key] = payload
        save_sensor_records()

        events.insert(0, {
            "time": payload["timestamp"],
            "type": "SENSOR_DATA_RECORDED",
            "deviceId": req.deviceId,
            "onChain": True,
        })

        return {
            "message": "Sensor data recorded on blockchain.",
            "sensorData": payload,
            "payloadHash": digest,
            "blockchain": result,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
