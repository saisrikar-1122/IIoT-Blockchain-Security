import hashlib, re
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

KEYS = Path(__file__).resolve().parent / "device_keys"
KEYS.mkdir(exist_ok=True)

def generate_identity(device_id: str) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", device_id or ""):
        raise ValueError("Use 1-64 letters, digits, underscores or hyphens for the device ID.")
    path = KEYS / f"{device_id}.private.pem"
    if path.exists():
        key = serialization.load_pem_private_key(path.read_bytes(), password=None)
    else:
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        path.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    public = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    return {"deviceId": device_id, "publicKey": public.decode(), "fingerprint": hashlib.sha256(public).hexdigest()}

def payload_hash(data: dict) -> str:
    import json
    return "0x" + hashlib.sha256(json.dumps(data, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
