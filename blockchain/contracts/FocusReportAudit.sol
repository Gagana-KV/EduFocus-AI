// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FocusReportAudit
 * @dev Cryptographic integrity and audit trail for student focus reports in EduFocus AI.
 * Stores only cryptographic SHA-256 hashes and timestamp metadata for zero-knowledge privacy.
 * No PII, student names, or conversation data is ever stored on-chain.
 */
contract FocusReportAudit {
    struct ReportRecord {
        bytes32 reportHash;
        uint256 timestamp;
        uint256 blockNumber;
        bool exists;
    }

    // Mapping from reportId to ReportRecord
    mapping(uint256 => ReportRecord) private _reports;

    // Total count of reports anchored to this blockchain contract
    uint256 public totalAnchoredReports;

    // Event emitted when a report is anchored to the blockchain
    event ReportAnchored(
        uint256 indexed reportId,
        bytes32 indexed reportHash,
        uint256 timestamp,
        uint256 blockNumber
    );

    /**
     * @dev Anchors a finalized report hash to the blockchain.
     * Enforces immutability: once registered, a reportId cannot be overwritten.
     * @param reportId The internal ID of the report in EduFocus AI.
     * @param reportHash The SHA-256 cryptographic hash of the finalized report markdown.
     */
    function recordReport(uint256 reportId, bytes32 reportHash) external returns (bool) {
        require(reportHash != bytes32(0), "Invalid report hash");
        require(!_reports[reportId].exists, "Report hash already permanently anchored on-chain");

        _reports[reportId] = ReportRecord({
            reportHash: reportHash,
            timestamp: block.timestamp,
            blockNumber: block.number,
            exists: true
        });

        totalAnchoredReports++;

        emit ReportAnchored(reportId, reportHash, block.timestamp, block.number);
        return true;
    }

    /**
     * @dev Verifies whether a given report content hash matches the immutable on-chain record.
     * @param reportId The internal report ID to verify.
     * @param reportHash The freshly computed SHA-256 hash of the report content.
     * @return isValid True if the hash matches the on-chain anchor exactly (untampered).
     * @return timestamp The blockchain block timestamp when the report was anchored.
     * @return blockNumber The block number where the transaction was mined.
     * @return exists Whether the report was ever recorded on-chain.
     */
    function verifyReport(uint256 reportId, bytes32 reportHash)
        external
        view
        returns (
            bool isValid,
            uint256 timestamp,
            uint256 blockNumber,
            bool exists
        )
    {
        ReportRecord memory record = _reports[reportId];
        if (!record.exists) {
            return (false, 0, 0, false);
        }
        return (record.reportHash == reportHash, record.timestamp, record.blockNumber, true);
    }

    /**
     * @dev Retrieves on-chain verification metadata for a report.
     * @param reportId The report ID to query.
     */
    function getReport(uint256 reportId)
        external
        view
        returns (
            bytes32 reportHash,
            uint256 timestamp,
            uint256 blockNumber,
            bool exists
        )
    {
        ReportRecord memory record = _reports[reportId];
        return (record.reportHash, record.timestamp, record.blockNumber, record.exists);
    }
}
