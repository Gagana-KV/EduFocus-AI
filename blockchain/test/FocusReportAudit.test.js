const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FocusReportAudit Smart Contract", function () {
  let auditContract;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const FocusReportAudit = await ethers.getContractFactory("FocusReportAudit");
    auditContract = await FocusReportAudit.deploy();
    await auditContract.waitForDeployment();
  });

  it("Should deploy with zero total anchored reports", async function () {
    expect(await auditContract.totalAnchoredReports()).to.equal(0);
  });

  it("Should record a report hash and emit ReportAnchored event", async function () {
    const reportId = 101;
    const reportHash = ethers.keccak256(ethers.toUtf8Bytes("Report content for Student Bobby Johnson - Focus Score: 85/100"));

    const tx = await auditContract.recordReport(reportId, reportHash);
    await tx.wait();

    expect(await auditContract.totalAnchoredReports()).to.equal(1);

    const [isValid, timestamp, blockNumber, exists] = await auditContract.verifyReport(reportId, reportHash);
    expect(isValid).to.be.true;
    expect(exists).to.be.true;
    expect(timestamp).to.be.gt(0);
    expect(blockNumber).to.be.gt(0);
  });

  it("Should detect tampering when report content has been altered", async function () {
    const reportId = 102;
    const originalHash = ethers.keccak256(ethers.toUtf8Bytes("Original Report: Focus Score 85/100, Distractions: 3"));
    const tamperedHash = ethers.keccak256(ethers.toUtf8Bytes("TAMPERED Report: Focus Score 100/100, Distractions: 0"));

    await (await auditContract.recordReport(reportId, originalHash)).wait();

    // Verify against tampered hash
    const [isValid, timestamp, blockNumber, exists] = await auditContract.verifyReport(reportId, tamperedHash);
    expect(isValid).to.be.false;
    expect(exists).to.be.true; // Exists on chain, but hash doesn't match!
  });

  it("Should prevent overwriting an already anchored report ID", async function () {
    const reportId = 103;
    const initialHash = ethers.keccak256(ethers.toUtf8Bytes("Version 1"));
    const modifiedHash = ethers.keccak256(ethers.toUtf8Bytes("Version 2"));

    await (await auditContract.recordReport(reportId, initialHash)).wait();

    await expect(
      auditContract.recordReport(reportId, modifiedHash)
    ).to.be.revertedWith("Report hash already permanently anchored on-chain");
  });

  it("Should return false for a non-existent report ID", async function () {
    const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("Non-existent report"));
    const [isValid, timestamp, blockNumber, exists] = await auditContract.verifyReport(99999, fakeHash);
    expect(isValid).to.be.false;
    expect(exists).to.be.false;
  });
});
