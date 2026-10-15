// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract IIoTSecurity {
    address public immutable admin;
    uint256 public constant MAX_TRUST = 100;
    uint256 public immutable minTrust;

    struct Device {
        string deviceId;
        string publicKeyFingerprint;
        uint256 trustScore;
        bool registered;
        bool accessGranted;
        uint256 registeredAt;
    }

    struct SecureTransaction {
        string deviceId;
        bytes32 payloadHash;
        uint256 timestamp;
        bool accepted;
    }

    mapping(bytes32 => Device) private devices;
    mapping(bytes32 => bool) private deviceIdUsed;
    SecureTransaction[] private transactions;
    uint256 public securityEventCount;

    event DeviceRegistered(string deviceId, string publicKeyFingerprint, uint256 trustScore);
    event SecureDataRecorded(string deviceId, bytes32 payloadHash, uint256 indexed transactionIndex, uint256 timestamp);
    event TrustUpdated(string deviceId, uint256 oldScore, uint256 newScore, string reason);
    event AccessChanged(string deviceId, bool accessGranted, string reason);
    event SecurityEventRecorded(string deviceId, string eventType, string details, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    constructor(uint256 minimumTrust) {
        require(minimumTrust > 0 && minimumTrust <= MAX_TRUST, "Invalid minimum trust");
        admin = msg.sender;
        minTrust = minimumTrust;
    }

    function registerDevice(string calldata deviceId, string calldata publicKeyFingerprint) external onlyAdmin {
        require(bytes(deviceId).length > 0 && bytes(deviceId).length <= 64, "Invalid device ID");
        require(bytes(publicKeyFingerprint).length > 0 && bytes(publicKeyFingerprint).length <= 128, "Invalid key fingerprint");
        bytes32 key = keccak256(bytes(deviceId));
        require(!deviceIdUsed[key], "Device already registered");
        deviceIdUsed[key] = true;
        devices[key] = Device(deviceId, publicKeyFingerprint, MAX_TRUST, true, true, block.timestamp);
        emit DeviceRegistered(deviceId, publicKeyFingerprint, MAX_TRUST);
    }

    function getDevice(string calldata deviceId) external view returns (
        string memory id, string memory fingerprint, uint256 trustScore,
        bool registered, bool accessGranted, uint256 registeredAt
    ) {
        Device storage d = devices[keccak256(bytes(deviceId))];
        return (d.deviceId, d.publicKeyFingerprint, d.trustScore, d.registered, d.accessGranted, d.registeredAt);
    }

    function isAuthorized(string calldata deviceId) public view returns (bool) {
        Device storage d = devices[keccak256(bytes(deviceId))];
        return d.registered && d.accessGranted && d.trustScore >= minTrust;
    }

    function recordSecureTransaction(string calldata deviceId, bytes32 payloadHash) external onlyAdmin {
        require(isAuthorized(deviceId), "Device not authorized");
        transactions.push(SecureTransaction(deviceId, payloadHash, block.timestamp, true));
        emit SecureDataRecorded(deviceId, payloadHash, transactions.length - 1, block.timestamp);
        Device storage d = devices[keccak256(bytes(deviceId))];
        uint256 oldScore = d.trustScore;
        if (d.trustScore < MAX_TRUST) {
            d.trustScore = d.trustScore + 5 > MAX_TRUST ? MAX_TRUST : d.trustScore + 5;
        }
        if (d.trustScore != oldScore) emit TrustUpdated(deviceId, oldScore, d.trustScore, "Successful transaction");
    }

    function recordSecurityEvent(string calldata deviceId, string calldata eventType, string calldata details, int256 trustDelta) external onlyAdmin {
        require(bytes(eventType).length > 0 && bytes(eventType).length <= 64, "Invalid event type");
        require(bytes(details).length <= 256, "Details too long");
        securityEventCount++;
        emit SecurityEventRecorded(deviceId, eventType, details, block.timestamp);
        bytes32 key = keccak256(bytes(deviceId));
        Device storage d = devices[key];
        if (d.registered && trustDelta != 0) {
            uint256 oldScore = d.trustScore;
            if (trustDelta < 0) {
                uint256 decrease = uint256(-trustDelta);
                d.trustScore = decrease >= d.trustScore ? 0 : d.trustScore - decrease;
            } else {
                uint256 increase = uint256(trustDelta);
                d.trustScore = increase + d.trustScore > MAX_TRUST ? MAX_TRUST : d.trustScore + increase;
            }
            bool allowed = d.trustScore >= minTrust;
            d.accessGranted = allowed;
            emit TrustUpdated(deviceId, oldScore, d.trustScore, eventType);
            if (!allowed) emit AccessChanged(deviceId, false, "Trust below minimum");
        }
    }

    function setAccess(string calldata deviceId, bool allowed, string calldata reason) external onlyAdmin {
        Device storage d = devices[keccak256(bytes(deviceId))];
        require(d.registered, "Device not registered");
        require(!allowed || d.trustScore >= minTrust, "Trust below minimum");
        d.accessGranted = allowed;
        emit AccessChanged(deviceId, allowed, reason);
    }

    function revokeDevice(string calldata deviceId, string calldata reason) external onlyAdmin {
        Device storage d = devices[keccak256(bytes(deviceId))];
        require(d.registered, "Device not registered");
        d.accessGranted = false;
        emit AccessChanged(deviceId, false, reason);
        securityEventCount++;
        emit SecurityEventRecorded(deviceId, "DEVICE_REVOKED", reason, block.timestamp);
    }

    function transactionCount() external view returns (uint256) { return transactions.length; }

    function getTransaction(uint256 index) external view returns (
        string memory deviceId, bytes32 payloadHash, uint256 timestamp, bool accepted
    ) {
        require(index < transactions.length, "Invalid transaction index");
        SecureTransaction storage t = transactions[index];
        return (t.deviceId, t.payloadHash, t.timestamp, t.accepted);
    }
}
