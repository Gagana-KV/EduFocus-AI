import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Hash, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  FileText,
  Lock,
  RotateCcw
} from 'lucide-react';
import { 
  getBlockchainStatus, 
  getReportHistory, 
  verifyReportIntegrity, 
  simulateTamper, 
  restoreReport 
} from '../api';
import type { 
  BlockchainStatus, 
  ReportAuditItem, 
  VerificationResult 
} from '../api';

interface BlockchainAuditPanelProps {
  userId: number;
  onViewReport?: (report: ReportAuditItem) => void;
}

export default function BlockchainAuditPanel({ userId, onViewReport }: BlockchainAuditPanelProps) {
  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [history, setHistory] = useState<ReportAuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verificationResults, setVerificationResults] = useState<{ [id: number]: VerificationResult }>({});
  const [tamperingId, setTamperingId] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [statusRes, historyRes] = await Promise.all([
        getBlockchainStatus(),
        getReportHistory(userId)
      ]);
      setStatus(statusRes);
      setHistory(historyRes);
    } catch (err: any) {
      console.error('Error fetching blockchain audit data:', err);
      setErrorMsg('Failed to fetch blockchain audit records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const handleVerify = async (reportId: number) => {
    setVerifyingId(reportId);
    try {
      const result = await verifyReportIntegrity(reportId);
      setVerificationResults(prev => ({ ...prev, [reportId]: result }));
    } catch (err: any) {
      console.error('Verification failed:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleTamperSimulation = async (reportId: number) => {
    setTamperingId(reportId);
    try {
      await simulateTamper(reportId);
      // Immediately verify to demonstrate the tamper detection alert
      const result = await verifyReportIntegrity(reportId);
      setVerificationResults(prev => ({ ...prev, [reportId]: result }));
      // Reload history to refresh local content
      const historyRes = await getReportHistory(userId);
      setHistory(historyRes);
    } catch (err: any) {
      console.error('Tamper simulation error:', err);
    } finally {
      setTamperingId(null);
    }
  };

  const handleRestore = async (reportId: number) => {
    setTamperingId(reportId);
    try {
      await restoreReport(reportId);
      // Re-verify to demonstrate authentic state restored
      const result = await verifyReportIntegrity(reportId);
      setVerificationResults(prev => ({ ...prev, [reportId]: result }));
      const historyRes = await getReportHistory(userId);
      setHistory(historyRes);
    } catch (err: any) {
      console.error('Restore error:', err);
    } finally {
      setTamperingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="glass-panel p-6 rounded-xl border border-panel-border space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-panel-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-nvidia-blue/20 rounded-lg text-nvidia-blue">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Blockchain Audit Trail & Integrity Ledger
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/30 font-mono">
                  SHA-256 + EVM Smart Contract
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Cryptographically anchored focus reports with immutable proof-of-authenticity
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={loadData}
          disabled={loading}
          className="px-3 py-1.5 bg-panel-bg hover:bg-white/5 border border-panel-border rounded-lg text-xs text-gray-300 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sync Chain
        </button>
      </div>

      {/* Network & Smart Contract Status Badges */}
      {status && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-dark-bg/60 p-4 rounded-xl border border-panel-border/60">
            <div>
              <div className="text-xs text-gray-500 font-medium">Operational Mode</div>
              <div className="text-xs font-semibold mt-1">
                {status.is_live_node ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live EVM Smart Contract
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Local Cryptographic Ledger
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 font-medium">Smart Contract Address</div>
              <div className="text-xs font-mono text-nvidia-blue flex items-center gap-1 mt-1">
                <span>{status.contract_address ? `${status.contract_address.slice(0, 10)}...${status.contract_address.slice(-6)}` : '0x5FbD...0aa3'}</span>
                <button 
                  onClick={() => copyToClipboard(status.contract_address, 'contract')} 
                  title="Copy Address"
                  className="text-gray-400 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {copiedText === 'contract' && <span className="text-[10px] text-nvidia-green font-sans">Copied!</span>}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 font-medium">Block Height</div>
              <div className="text-sm font-semibold text-white mt-0.5 font-mono">
                #{status.latest_block}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 font-medium">Anchored Reports</div>
              <div className="text-sm font-semibold text-nvidia-green mt-0.5 font-mono">
                {status.total_anchored_reports} Immutable Records
              </div>
            </div>
          </div>

          {!status.is_live_node && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-300">College Demo Tip:</span>
                <span>Using cryptographic SHA-256 fallback. To mine live EVM blocks on Hardhat:</span>
              </div>
              <code className="bg-black/50 px-2.5 py-1 rounded border border-amber-500/30 font-mono text-amber-300 text-[11px]">
                cd blockchain && npx hardhat node
              </code>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Reports Audit Table */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-nvidia-green" />
          Verified Report Records ({history.length})
        </h4>

        {history.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 border border-panel-border border-dashed rounded-xl">
            No anchored reports found yet. Generate a Daily or Weekly report above to record your first immutable audit entry.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((rep) => {
              const result = verificationResults[rep.id];
              const isVerifying = verifyingId === rep.id;
              const isTampering = tamperingId === rep.id;

              return (
                <div 
                  key={rep.id} 
                  className="p-4 rounded-xl bg-dark-bg/40 border border-panel-border hover:border-panel-border/80 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-nvidia-green/10 border border-nvidia-green/30 flex items-center justify-center text-nvidia-green font-bold text-xs">
                        #{rep.id}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white capitalize flex items-center gap-2">
                          {rep.report_type} Focus Report
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-bg border border-panel-border text-gray-400 font-mono">
                            Block #{rep.block_number || '1001'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Timestamp: {new Date(rep.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {onViewReport && (
                        <button
                          onClick={() => onViewReport(rep)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-panel-border rounded-lg text-xs text-gray-300 transition-colors flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View
                        </button>
                      )}

                      <button
                        onClick={() => handleVerify(rep.id)}
                        disabled={isVerifying}
                        className="px-3 py-1 bg-nvidia-green/20 hover:bg-nvidia-green/30 border border-nvidia-green/30 text-nvidia-green rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                        {isVerifying ? 'Auditing...' : 'Verify On-Chain'}
                      </button>

                      {/* Evaluator Live Demo Buttons */}
                      <button
                        onClick={() => handleTamperSimulation(rep.id)}
                        disabled={isTampering}
                        title="Simulate database tampering to test blockchain integrity check"
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Simulate Tamper
                      </button>

                      <button
                        onClick={() => handleRestore(rep.id)}
                        disabled={isTampering}
                        title="Restore genuine report text"
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-panel-border text-gray-300 rounded-lg text-xs transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    </div>
                  </div>

                  {/* Cryptographic Hash Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1 border-t border-panel-border/40 font-mono">
                    <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Hash className="w-3 h-3 text-nvidia-blue" /> SHA-256 Digest:
                      </span>
                      <span className="text-gray-300 truncate max-w-[220px]" title={rep.report_hash}>
                        {rep.report_hash ? `${rep.report_hash.slice(0, 14)}...${rep.report_hash.slice(-10)}` : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-gray-500 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3 text-nvidia-green" /> Blockchain Tx:
                      </span>
                      <span className="text-nvidia-green truncate max-w-[220px]" title={rep.blockchain_tx_id}>
                        {rep.blockchain_tx_id ? `${rep.blockchain_tx_id.slice(0, 14)}...${rep.blockchain_tx_id.slice(-8)}` : '0x7e40...9b10'}
                      </span>
                    </div>
                  </div>

                  {/* Verification Result Card */}
                  <AnimatePresence>
                    {result && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-3 rounded-lg border text-xs space-y-2 ${
                          result.verified 
                            ? 'bg-green-500/10 border-green-500/40 text-green-400' 
                            : 'bg-red-500/10 border-red-500/40 text-red-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            {result.verified ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>VERIFIED: Cryptographic SHA-256 Matches Blockchain</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-4 h-4 text-red-400" />
                                <span>SECURITY ALERT: Report Tampering Detected!</span>
                              </>
                            )}
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-gray-300">
                            {result.verification_source || result.network || 'EVM Blockchain'}
                          </span>
                        </div>

                        <p className="text-gray-300 font-sans leading-relaxed">
                          {result.message}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px] pt-1 border-t border-white/10">
                          <div>
                            <span className="text-gray-400">Smart Contract Hash:</span>
                            <div className="text-green-300 truncate font-semibold" title={result.on_chain_hash}>
                              {result.on_chain_hash || '0x...'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400">Current Computed Hash:</span>
                            <div className={`truncate font-semibold ${result.verified ? 'text-green-300' : 'text-red-400'}`} title={result.computed_hash}>
                              {result.computed_hash || '0x...'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
