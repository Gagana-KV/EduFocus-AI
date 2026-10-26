import axios from 'axios';

const getInitialApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    // Automatically infer the backend URL if running on Render and env var wasn't baked in
    const backendHost = window.location.hostname.replace('frontend', 'backend');
    return `https://${backendHost}/api`;
  }
  return 'http://localhost:8000/api';
};

export const API_BASE_URL = getInitialApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Dynamically converts the HTTP/HTTPS API Base URL into a WS/WSS URL
 * so WebSockets work both locally and in cloud environments (Render, AWS, etc.)
 */
export const getWebSocketUrl = (endpoint: string): string => {
  const isSecure = window.location.protocol === 'https:' || API_BASE_URL.startsWith('https:');
  const wsProtocol = isSecure ? 'wss:' : 'ws:';
  try {
    const url = new URL(API_BASE_URL);
    return `${wsProtocol}//${url.host}${endpoint}`;
  } catch {
    return `${wsProtocol}//${window.location.host}${endpoint}`;
  }
};

export interface BlockchainStatus {
  status: string;
  provider: string;
  network: string;
  contract_address: string;
  latest_block: number;
  total_anchored_reports: number;
  is_live_node: boolean;
  mode?: 'live_smart_contract' | 'cryptographic_ledger_fallback';
  mode_label?: string;
  tip?: string;
}

export interface ReportAuditItem {
  id: number;
  user_id: number;
  report_type: string;
  content: string;
  timestamp: string;
  report_hash?: string;
  blockchain_tx_id?: string;
  block_number?: number;
  network?: string;
}

export interface VerificationResult {
  verified: boolean;
  status: 'VERIFIED' | 'TAMPERED' | 'NOT_FOUND';
  message: string;
  verification_source?: string;
  computed_hash?: string;
  on_chain_hash?: string;
  tx_hash?: string;
  block_number?: number;
  network?: string;
  timestamp?: string;
  report_id?: number;
  report_type?: string;
  db_stored_hash?: string;
}

// Blockchain API helpers
export const getBlockchainStatus = async (): Promise<BlockchainStatus> => {
  const res = await api.get('/blockchain/status');
  return res.data;
};

export const getReportHistory = async (userId: number): Promise<ReportAuditItem[]> => {
  const res = await api.get(`/reports/history/${userId}`);
  return res.data;
};

export const verifyReportIntegrity = async (reportId: number): Promise<VerificationResult> => {
  const res = await api.post(`/blockchain/verify-report/${reportId}`);
  return res.data;
};

export const simulateTamper = async (reportId: number) => {
  const res = await api.post(`/blockchain/simulate-tamper/${reportId}`);
  return res.data;
};

export const restoreReport = async (reportId: number) => {
  const res = await api.post(`/blockchain/restore-report/${reportId}`);
  return res.data;
};

export default api;
