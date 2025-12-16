export type LoomID = '1' | '2' | '3' | '4';

export type TransactionType = 'MATERIAL_IN' | 'SAREE_OUT';

export type ItemType = 'CONE' | 'JARIGAI' | 'SAREE';

export interface Transaction {
  id: string;
  date: string; // ISO Date String
  billNo: string;
  loomId: LoomID;
  type: TransactionType;
  item: ItemType;
  quantity: number;
  notes?: string;
  timestamp: number;
  batchId?: string; // New: Links transaction to a specific batch cycle
  isArchived?: boolean; // Deprecated but kept for backward compatibility if needed
}

export interface LoomConfig {
  id: LoomID;
  startDate: string; 
  targetQty: number;
  coneFactor: number;
  jarigaiFactor: number;
  currentBatchId?: string; // The active batch ID for this loom
  batchNumber?: number; // Sequential batch number (e.g., 1, 2, 3)
}

export interface CloudConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const DEFAULT_LOOM_CONFIGS: Record<LoomID, LoomConfig> = {
  '1': { id: '1', startDate: new Date().toISOString().split('T')[0], targetQty: 80, coneFactor: 0.450, jarigaiFactor: 0.1, currentBatchId: 'batch_legacy_1', batchNumber: 1 },
  '2': { id: '2', startDate: new Date().toISOString().split('T')[0], targetQty: 80, coneFactor: 0.450, jarigaiFactor: 0.1, currentBatchId: 'batch_legacy_2', batchNumber: 1 },
  '3': { id: '3', startDate: new Date().toISOString().split('T')[0], targetQty: 80, coneFactor: 0.450, jarigaiFactor: 0.1, currentBatchId: 'batch_legacy_3', batchNumber: 1 },
  '4': { id: '4', startDate: new Date().toISOString().split('T')[0], targetQty: 80, coneFactor: 0.450, jarigaiFactor: 0.1, currentBatchId: 'batch_legacy_4', batchNumber: 1 },
};