import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  Hash, 
  Lock, 
  Copy, 
  AlertTriangle, 
  RotateCcw
} from 'lucide-react';
import { verifyReportIntegrity, simulateTamper, restoreReport } from '../api';
import type { VerificationResult } from '../api';

export interface ReportModalData {
  type: string;
  content: string;
  reportId?: number;
  reportHash?: string;
  txHash?: string;
  blockNumber?: number;
  network?: string;
  studentName?: string;
}

interface ReportModalProps {
  data: ReportModalData | null;
  onClose: () => void;
}

export default function ReportModal({ data, onClose }: ReportModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentContent, setCurrentContent] = useState<string | null>(null);

  if (!data) return null;

  const displayContent = currentContent !== null ? currentContent : data.content;

  const handleVerify = async () => {
    if (!data.reportId) return;
    setVerifying(true);
    try {
      const res = await verifyReportIntegrity(data.reportId);
      setVerification(res);
    } catch (err) {
      console.error('Integrity verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    if (!data.reportId) return;
    setTampering(true);
    try {
      await simulateTamper(data.reportId);
      // Alter local displayed content to show the tamper
      setCurrentContent(displayContent + "\n\n⚠️ [UNAUTHORIZED DATABASE EDIT: Student focus score was artificially elevated by 20 points]");
      const res = await verifyReportIntegrity(data.reportId);
      setVerification(res);
    } catch (err) {
      console.error('Tamper simulation failed:', err);
    } finally {
      setTampering(false);
    }
  };

  const handleRestore = async () => {
    if (!data.reportId) return;
    setTampering(true);
    try {
      await restoreReport(data.reportId);
      setCurrentContent(data.content);
      const res = await verifyReportIntegrity(data.reportId);
      setVerification(res);
    } catch (err) {
      console.error('Restore failed:', err);
    } finally {
      setTampering(false);
    }
  };

  const copyHash = () => {
    if (data.reportHash) {
      navigator.clipboard.writeText(data.reportHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 report-modal-overlay"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-dark-bg border border-panel-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl report-modal-content overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center p-5 border-b border-panel-border bg-panel-bg/40 hide-on-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nvidia-blue/20 border border-nvidia-blue/40 flex items-center justify-center text-nvidia-blue">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                  {data.type} Focus Report
                  {data.reportId && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-nvidia-green/20 text-nvidia-green border border-nvidia-green/30 font-mono">
                      Block #{data.blockNumber || '1004'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400">
                  Secured with SHA-256 Cryptographic Hash & Solidity Smart Contract
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.print()} 
                className="px-3.5 py-1.5 bg-nvidia-blue hover:bg-nvidia-blue/80 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-nvidia-blue/20"
              >
                <Download className="w-3.5 h-3.5" /> Print / PDF
              </button>
              <button 
                onClick={onClose} 
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Blockchain Audit & Verification Header (Interactive) */}
          {data.reportId && (
            <div className="bg-black/50 p-4 border-b border-panel-border hide-on-print space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-nvidia-blue" /> Hash:
                  </span>
                  <span className="px-2 py-0.5 bg-panel-bg rounded border border-panel-border text-gray-200">
                    {data.reportHash ? `${data.reportHash.slice(0, 14)}...${data.reportHash.slice(-8)}` : '0x...'}
                  </span>
                  <button 
                    onClick={copyHash}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Copy full SHA-256 hash"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copied && <span className="text-nvidia-green text-[11px] font-sans">Copied!</span>}

                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">Network:</span>
                  <span className="text-nvidia-green font-semibold">
                    {data.network || 'EVM Blockchain'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="px-3 py-1.5 bg-nvidia-green/20 hover:bg-nvidia-green/30 border border-nvidia-green/40 text-nvidia-green rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                    {verifying ? 'Verifying...' : 'Verify Cryptographic Integrity'}
                  </button>

                  <button
                    onClick={handleSimulateTamper}
                    disabled={tampering}
                    title="Simulate unauthorized database modification"
                    className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs transition-colors flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Tamper Demo
                  </button>

                  <button
                    onClick={handleRestore}
                    disabled={tampering}
                    title="Restore authentic report"
                    className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 border border-panel-border text-gray-300 rounded-lg text-xs transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                </div>
              </div>

              {/* Verification Feedback Banner */}
              {verification && (
                <div className={`p-3 rounded-lg border text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                  verification.verified 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                    : 'bg-red-500/15 border-red-500/40 text-red-400'
                }`}>
                  <div className="flex items-center gap-2 font-medium">
                    {verification.verified ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                        <span>VERIFIED: Database content matches immutable audit record ({verification.verification_source || verification.network})</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                        <span>TAMPER DETECTED: Report content differs from blockchain record!</span>
                      </>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-gray-300">
                    Tx: {verification.tx_hash ? `${verification.tx_hash.slice(0, 10)}...${verification.tx_hash.slice(-6)}` : '0x...'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Printable Report Body */}
          <div className="p-8 overflow-y-auto print-content bg-white text-black flex-1">
            <div className="mb-6 border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">EduFocus AI</h1>
                  <p className="text-gray-600 font-medium capitalize text-sm mt-0.5">
                    {data.type} Focus & Productivity Report {data.studentName ? `for ${data.studentName}` : ''}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>Date: {new Date().toLocaleDateString()}</div>
                  {data.reportId && (
                    <div className="font-mono text-gray-600 mt-1">
                      Report ID #{data.reportId} | Block #{data.blockNumber || '1004'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Markdown rendered body */}
            <div className="prose max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed font-sans text-sm md:text-base">
              {displayContent}
            </div>

            {/* Blockchain Seal Footer on Print */}
            {data.reportHash && (
              <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center font-mono">
                <div>
                  Blockchain SHA-256 Digest: {data.reportHash}
                </div>
                <div>
                  Smart Contract Verified: {data.network || 'EVM Blockchain'}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
