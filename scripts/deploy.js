const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const Factory = await hre.ethers.getContractFactory("IIoTSecurity");
  const contract = await Factory.deploy(20);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("Deployer:", deployer.address);
  console.log("IIoTSecurity deployed to:", address);
  console.log("Copy this address into python/.env as CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
