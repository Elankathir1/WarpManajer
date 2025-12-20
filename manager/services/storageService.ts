
import { AppData, LoomConfig, LoomID, Transaction } from '../types';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, update, remove } from 'firebase/database';

const DATABASE_URL = 'https://warpmanager-80839-default-rtdb.asia-southeast1.firebasedatabase.app';
const CURRENT_SCHEMA_VERSION = 3;

const DEFAULT_CONFIGS: Record<LoomID, LoomConfig> = {
  '1': { id: '1', target: 80, current: 0, batchNumber: 1, coneStock: 10, jarigaiStock: 5, coneUsageFactor: 0.12, jarigaiUsageFactor: 0.05 },
  '2': { id: '2', target: 80, current: 0, batchNumber: 1, coneStock: 10, jarigaiStock: 5, coneUsageFactor: 0.12, jarigaiUsageFactor: 0.05 },
  '3': { id: '3', target: 80, current: 0, batchNumber: 1, coneStock: 10, jarigaiStock: 5, coneUsageFactor: 0.12, jarigaiUsageFactor: 0.05 },
  '4': { id: '4', target: 80, current: 0, batchNumber: 1, coneStock: 10, jarigaiStock: 5, coneUsageFactor: 0.12, jarigaiUsageFactor: 0.05 },
};

const ZERO_CONFIGS: Record<LoomID, LoomConfig> = {
  '1': { id: '1', target: 80, current: 0, batchNumber: 0, coneStock: 0, jarigaiStock: 0, coneUsageFactor: 0.12, jarigaiUsageFactor: 0.05 },
  '2': { id: '2', target: 80, current: 0, batchNumber: 0, coneStock: 0, jarigaiStock: 0, coneUsageFactor: 0.12, jarigaiUsageFactor: 0.05 },
  '3': { id: '3', target: 80, current: 0, batchNumber: 0, coneStock: 0, jarigaiStock: 0, coneUsageFactor: 0.12, jarigaiUsageFactor: 0.05 },
  '4': { id: '4', target: 80, current: 0, batchNumber: 0, coneStock: 0, jarigaiStock: 0, coneUsageFactor: 0.12, jarigaiUsageFactor: 0.05 },
};

class StorageService {
  private db: any;
  private listeners: (() => void)[] = [];
  private cache: AppData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    transactions: [],
    loomConfigs: DEFAULT_CONFIGS
  };
  private loading = true;
  private isConnected = false;

  constructor() {
    const firebaseConfig = { databaseURL: DATABASE_URL };
    const app = initializeApp(firebaseConfig);
    this.db = getDatabase(app);
    this.initRealtimeSync();
  }

  private initRealtimeSync() {
    const dataRef = ref(this.db, 'warp_manager_data');
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        this.resetAll(false);
      } else {
        this.cache = {
          ...data,
          transactions: data.transactions ? Object.values(data.transactions) : []
        };
        if (this.cache.schemaVersion < CURRENT_SCHEMA_VERSION) {
          this.migrate(this.cache);
        }
        this.isConnected = true;
        this.loading = false;
        this.notify();
      }
    });
  }

  private async migrate(data: AppData) {
    data.schemaVersion = CURRENT_SCHEMA_VERSION;
    await set(ref(this.db, 'warp_manager_data/schemaVersion'), CURRENT_SCHEMA_VERSION);
  }

  initializeCloud() {}

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify() { this.listeners.forEach(l => l()); }

  getTransactions(): Transaction[] {
    return [...this.cache.transactions].sort((a, b) => b.timestamp - a.timestamp);
  }

  getLoomConfigs(): Record<LoomID, LoomConfig> {
    return this.cache.loomConfigs || DEFAULT_CONFIGS;
  }

  getLoadingStatus(): boolean { return this.loading; }
  getConnectionStatus(): boolean { return this.isConnected; }
  getProjectId(): string { return "PRJ-WARP-CLOUD-80839"; }

  private async addOpeningBalanceEntries(config: LoomConfig, timestamp: number, updates: any) {
    const coneId = `opening-cone-${config.id}-${config.batchNumber}-${timestamp}`;
    const jarigaiId = `opening-jarigai-${config.id}-${config.batchNumber}-${timestamp + 1}`;

    updates[`transactions/${coneId}`] = {
      id: coneId, loomId: config.id, batchNumber: config.batchNumber, type: 'CONE_OPENING',
      value: config.coneStock, timestamp, note: `Opening Balance (Batch #${config.batchNumber})`
    };

    updates[`transactions/${jarigaiId}`] = {
      id: jarigaiId, loomId: config.id, batchNumber: config.batchNumber, type: 'JARIGAI_OPENING',
      value: config.jarigaiStock, timestamp: timestamp + 1, note: `Opening Balance (Batch #${config.batchNumber})`
    };
  }

  /**
   * Atomic batch update for multiple transactions to prevent race conditions.
   */
  async addBatchTransactions(loomId: LoomID, txs: Omit<Transaction, 'id' | 'timestamp' | 'batchNumber' | 'loomId'>[]) {
    const config = { ...this.cache.loomConfigs[loomId] };
    const timestamp = Date.now();
    const updates: any = {};

    for (const tx of txs) {
      if (tx.type === 'PRODUCTION') {
        let remainingValue = tx.value;
        while (remainingValue > 0) {
          const spaceInBatch = Math.max(0, config.target - config.current);
          if (remainingValue > spaceInBatch && spaceInBatch > 0) {
            const fillValue = spaceInBatch;
            const id = Math.random().toString(36).substr(2, 9);
            updates[`transactions/${id}`] = {
              ...tx, loomId, value: fillValue, batchNumber: config.batchNumber, id, timestamp,
              note: `${tx.note || ''} (Batch #${config.batchNumber} Part)`.trim()
            };
            config.coneStock -= fillValue * config.coneUsageFactor;
            config.jarigaiStock -= fillValue * config.jarigaiUsageFactor;
            config.current = 0;
            config.batchNumber += 1;
            remainingValue -= fillValue;
            this.addOpeningBalanceEntries(config, timestamp + 10, updates);
          } else {
            const id = Math.random().toString(36).substr(2, 9);
            updates[`transactions/${id}`] = {
              ...tx, loomId, value: remainingValue, batchNumber: config.batchNumber, id, timestamp: timestamp + 20,
              note: remainingValue !== tx.value ? `${tx.note || ''} (Batch #${config.batchNumber} Overflow)`.trim() : tx.note
            };
            config.current += remainingValue;
            config.coneStock -= remainingValue * config.coneUsageFactor;
            config.jarigaiStock -= remainingValue * config.jarigaiUsageFactor;
            if (config.current >= config.target) {
              config.current = 0;
              config.batchNumber += 1;
              this.addOpeningBalanceEntries(config, timestamp + 30, updates);
            }
            remainingValue = 0;
          }
        }
      } else {
        const id = Math.random().toString(36).substr(2, 9);
        updates[`transactions/${id}`] = { ...tx, loomId, batchNumber: config.batchNumber, id, timestamp };
        if (tx.type === 'CONE_RECEIPT') config.coneStock += tx.value;
        else if (tx.type === 'JARIGAI_RECEIPT') config.jarigaiStock += tx.value;
        else if (tx.type === 'CONE_RETURN') config.coneStock -= tx.value;
        else if (tx.type === 'JARIGAI_RETURN') config.jarigaiStock -= tx.value;
      }
    }

    updates[`loomConfigs/${config.id}`] = config;
    await update(ref(this.db, 'warp_manager_data'), updates);
  }

  // Backwards compatibility for single transaction
  async addTransaction(transaction: Omit<Transaction, 'id' | 'timestamp' | 'batchNumber'>) {
    const { loomId, ...rest } = transaction;
    await this.addBatchTransactions(loomId, [rest]);
  }

  async deleteOldBatchesData(loomId: LoomID, currentBatchNumber: number) {
    const rawTxs = this.cache.transactions;
    const toDelete = rawTxs.filter(tx => tx.loomId === loomId && tx.batchNumber < currentBatchNumber);
    for (const tx of toDelete) { await remove(ref(this.db, `warp_manager_data/transactions/${tx.id}`)); }
    return toDelete.length;
  }

  async deleteCurrentAndReset(loomId: LoomID) {
    const config = { ...this.cache.loomConfigs[loomId] };
    const currentBN = config.batchNumber;
    const toDelete = this.cache.transactions.filter(tx => tx.loomId === loomId && tx.batchNumber === currentBN);
    for (const tx of toDelete) { await remove(ref(this.db, `warp_manager_data/transactions/${tx.id}`)); }
    config.batchNumber = 1;
    config.current = 0;
    const updates: any = {};
    updates[`loomConfigs/${loomId}`] = config;
    await this.addOpeningBalanceEntries(config, Date.now(), updates);
    await update(ref(this.db, 'warp_manager_data'), updates);
    return toDelete.length;
  }

  async updateLoomSettings(loomId: LoomID, settings: { target: number, coneUsageFactor: number, jarigaiUsageFactor: number }) {
    const config = { ...this.cache.loomConfigs[loomId], ...settings };
    await set(ref(this.db, `warp_manager_data/loomConfigs/${loomId}`), config);
  }

  async resetAll(toZero: boolean = true) {
    const configs = toZero ? ZERO_CONFIGS : DEFAULT_CONFIGS;
    const initialData = { schemaVersion: CURRENT_SCHEMA_VERSION, transactions: {}, loomConfigs: configs };
    await set(ref(this.db, 'warp_manager_data'), initialData);
    const updates: any = {};
    for (const config of Object.values(configs)) {
      await this.addOpeningBalanceEntries(config, Date.now(), updates);
    }
    await update(ref(this.db, 'warp_manager_data'), updates);
  }

  exportData() {
    const data = JSON.stringify(this.cache, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `warpmanager-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  async importData(jsonData: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.transactions || !parsed.loomConfigs) throw new Error("Invalid file format.");
      const transactions = Array.isArray(parsed.transactions) 
        ? parsed.transactions.reduce((acc: any, tx: Transaction) => { acc[tx.id] = tx; return acc; }, {})
        : parsed.transactions;
      await set(ref(this.db, 'warp_manager_data'), { ...parsed, transactions, schemaVersion: CURRENT_SCHEMA_VERSION });
      return { success: true, message: "Data imported successfully." };
    } catch (e: any) { return { success: false, message: e.message }; }
  }
}

export const storageService = new StorageService();
