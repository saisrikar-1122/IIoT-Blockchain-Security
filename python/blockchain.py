import json, os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
load_dotenv(HERE / ".env")
ABI = ROOT / "artifacts/contracts/IIoTSecurity.sol/IIoTSecurity.json"

class BlockchainService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL", "http://127.0.0.1:8545"), request_kwargs={"timeout": 5}))
        self.address = os.getenv("CONTRACT_ADDRESS", "").strip()
        self.contract = None
        if self.w3.is_connected() and self.address and ABI.exists():
            self.contract = self.w3.eth.contract(address=Web3.to_checksum_address(self.address), abi=json.loads(ABI.read_text())['abi'])

    def require(self):
        if not self.w3.is_connected(): raise RuntimeError("Start the Hardhat node first.")
        if self.contract is None: raise RuntimeError("Deploy the contract and set CONTRACT_ADDRESS in python/.env.")
        return self.contract

    def send(self, function):
        c = self.require()
        key = os.getenv("ADMIN_PRIVATE_KEY", "").strip()
        if not key: raise RuntimeError("ADMIN_PRIVATE_KEY is missing in python/.env.")
        account = self.w3.eth.account.from_key(key)
        if account.address.lower() != c.functions.admin().call().lower(): raise RuntimeError("Admin key does not match contract admin.")
        tx = function.build_transaction({"from": account.address, "nonce": self.w3.eth.get_transaction_count(account.address), "chainId": self.w3.eth.chain_id, "gas": 2000000, "gasPrice": self.w3.eth.gas_price})
        signed = account.sign_transaction(tx)
        receipt = self.w3.eth.wait_for_transaction_receipt(self.w3.eth.send_raw_transaction(signed.raw_transaction), timeout=60)
        if receipt.status != 1: raise RuntimeError("Transaction reverted.")
        return {"transactionHash": receipt.transactionHash.hex(), "blockNumber": receipt.blockNumber, "status": "confirmed"}

    def device(self, device_id):
        d = self.require().functions.getDevice(device_id).call()
        return {"deviceId": d[0], "fingerprint": d[1], "trustScore": int(d[2]), "registered": bool(d[3]), "accessGranted": bool(d[4]), "authorized": bool(self.contract.functions.isAuthorized(device_id).call())}

    def register(self, device_id, fingerprint):
        if self.device(device_id)["registered"]: raise ValueError("Device ID is already registered.")
        return self.send(self.require().functions.registerDevice(device_id, fingerprint))

    def record(self, device_id, digest):
        if not self.device(device_id)["authorized"]: raise ValueError("Device is not registered or authorized.")
        return self.send(self.require().functions.recordSecureTransaction(device_id, bytes.fromhex(digest.removeprefix("0x"))))

    def status(self):
        connected = self.w3.is_connected()
        result = {"connected": connected, "latestBlock": int(self.w3.eth.block_number) if connected else None, "contractLoaded": self.contract is not None, "contractAddress": self.address or None, "chainId": int(self.w3.eth.chain_id) if connected else None}
        if self.contract:
            result["transactionCount"] = int(self.contract.functions.transactionCount().call())
            result["admin"] = self.contract.functions.admin().call()
        return result

    def transactions(self, limit=30):
        c = self.require(); count = int(c.functions.transactionCount().call()); rows = []
        for i in range(max(0, count-limit), count):
            t = c.functions.getTransaction(i).call()
            rows.append({"index": i, "deviceId": t[0], "payloadHash": t[1].hex(), "timestamp": int(t[2]), "accepted": bool(t[3])})
        return list(reversed(rows))
