const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("----------------------------------------------------");
  console.log("Deploying FocusReportAudit Smart Contract to network:", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const FocusReportAudit = await hre.ethers.getContractFactory("FocusReportAudit");
  const contract = await FocusReportAudit.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("====================================================");
  console.log("FocusReportAudit deployed successfully to:", contractAddress);
  console.log("Transaction Hash:", contract.deploymentTransaction()?.hash);
  console.log("====================================================");

  // Extract ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/FocusReportAudit.sol/FocusReportAudit.json");
  let abi = [];
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    abi = artifact.abi;
  }

  const deploymentData = {
    contract_address: contractAddress,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployed_at: new Date().toISOString(),
    deployer: deployer.address,
    abi: abi
  };

  // Save to backend directory so FastAPI backend automatically picks it up
  const backendDataPath = path.join(__dirname, "../../backend/contract_data.json");
  fs.writeFileSync(backendDataPath, JSON.stringify(deploymentData, null, 2));
  console.log("Saved contract metadata to backend:", backendDataPath);

  // Also save locally in blockchain directory
  const localDataPath = path.join(__dirname, "../deployed_address.json");
  fs.writeFileSync(localDataPath, JSON.stringify(deploymentData, null, 2));
  console.log("Saved contract metadata locally:", localDataPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
