
/**
 * Represents valid Loom IDs in the system
 */
export type LoomID = '1' | '2' | '3' | '4';

/**
 * Types of transactions supported by the inventory system
 */
export type TransactionType = 
  | 'PRODUCTION' 
  | 'CONE_RECEIPT' 
  | 'JARIGAI_RECEIPT' 
  | 'CONE_RETURN' 
  | 'JARIGAI_RETURN'
  | 'CONE_OPENING'
  | 'JARIGAI_OPENING';

/**
 * A single entry in the loom history
 */
export interface Transaction {
  id: string;
  loomId: LoomID;
  batchNumber: number; // Linked to a specific batch
  type: TransactionType;
  value: number;
  note?: string;
  timestamp: number;
}

/**
 * Represents a manufacturing batch with full material audit
 */
export interface Batch {
  id: string;
  loomId: LoomID;
  batchNumber: number;
  target: number;
  produced: number;
  remaining: number;
  status: 'current' | 'completed';
  color?: string;
  startTime: number;
  endTime?: number;
  
  // Material Audit
  openingCone: number;
  openingJarigai: number;
  receivedCone: number;
  receivedJarigai: number;
  returnedCone: number;
  returnedJarigai: number;
  consumedCone: number;
  consumedJarigai: number;
  closingCone: number;
  closingJarigai: number;
}

/**
 * Structured response for batch queries
 */
export interface BatchResponse {
  current_batch: Batch | null;
  last_three_completed: Batch[];
}

/**
 * Configuration and state for a specific loom
 */
export interface LoomConfig {
  id: LoomID;
  target: number;
  current: number;
  batchNumber: number; // Current active batch number
  coneStock: number;
  jarigaiStock: number;
  coneUsageFactor: number;
  jarigaiUsageFactor: number;
}

/**
 * Root data structure for local storage
 */
export interface AppData {
  schemaVersion: number; // To prevent data loss on updates
  transactions: Transaction[];
  loomConfigs: Record<LoomID, LoomConfig>;
}

/**
 * Represents a code file in the system
 */
export interface CodeFile {
  name: string;
  content: string;
}

/**
 * Response structure for AI-driven code updates
 */
export interface UpdateResponse {
  updatedFiles: {
    filename: string;
    content: string;
    explanation: string;
  }[];
  summary: string;
}
