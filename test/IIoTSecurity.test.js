const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IIoTSecurity", function () {
  async function setup() {
    const [admin, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("IIoTSecurity");
    const contract = await Factory.deploy(20);
    await contract.waitForDeployment();
    return { admin, other, contract };
  }

  it("registers a device and starts it at trust 100", async function () {
    const { contract } = await setup();
    await contract.registerDevice("DEV001", "fingerprint-001");
    const d = await contract.getDevice("DEV001");
    expect(d.registered).to.equal(true);
    expect(d.trustScore).to.equal(100n);
    expect(d.accessGranted).to.equal(true);
  });

  it("rejects duplicate device IDs", async function () {
    const { contract } = await setup();
    await contract.registerDevice("DEV001", "fingerprint-001");
    await expect(contract.registerDevice("DEV001", "fingerprint-002"))
      .to.be.revertedWith("Device already registered");
  });

  it("does not allow non-admin registration", async function () {
    const { contract, other } = await setup();
    await expect(contract.connect(other).registerDevice("DEV002", "fingerprint-002"))
      .to.be.revertedWith("Admin only");
  });

  it("records secure transactions only for authorized devices", async function () {
    const { contract } = await setup();
    await contract.registerDevice("DEV001", "fingerprint-001");
    await contract.recordSecureTransaction("DEV001", ethers.keccak256(ethers.toUtf8Bytes("payload")));
    expect(await contract.transactionCount()).to.equal(1n);
  });

  it("lowers trust and denies access below the threshold", async function () {
    const { contract } = await setup();
    await contract.registerDevice("DEV001", "fingerprint-001");
    for (let i = 0; i < 9; i++) {
      await contract.recordSecurityEvent("DEV001", "INVALID_SIGNATURE", "test", -10);
    }
    const d = await contract.getDevice("DEV001");
    expect(d.trustScore).to.equal(10n);
    expect(d.accessGranted).to.equal(false);
    expect(await contract.isAuthorized("DEV001")).to.equal(false);
  });
});
