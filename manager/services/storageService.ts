import { LoomConfig, Transaction, DEFAULT_LOOM_CONFIGS, LoomID } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  update, 
  remove 
} from 'firebase/database';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAePkyOHqAUWpe42XxCdMIGq1uoqn27rOg",
  authDomain: "warpmanager-80839.firebaseapp.com",
  projectId: "warpmanager-80839",
  storageBucket: "warpmanager-80839.firebasestorage.app",
  messagingSenderId: "305574303128",
  appId: "1:305574303128:web:2bac4e26a7b548609707ed",
  measurementId: "G-2DWHZH9KV5",
  databaseURL: "https://warpmanager-80839-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase (RTDB)
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log(`[Firebase RTDB] Connected to: ${firebaseConfig.databaseURL}`);

// Local Memory Cache
let localTransactions: Transaction[] = [];
// Start with defaults in memory (Read-Only until Cloud Loads)
let localConfigs: Record<LoomID, LoomConfig> = JSON.parse(JSON.stringify(DEFAULT_LOOM_CONFIGS));

// Loading States
let isTxLoaded = false;
let isConfigLoaded = false;
let isInitialized = false;

// Event Listeners
type ChangeListener = () => void;
const listeners: ChangeListener[] = [];

// Helper to round numbers
const cleanNum = (num: number) => Math.round((num + Number.EPSILON) * 1000) / 1000;

export const storageService = {
  
  // Expose Project ID for UI verification
  getProjectId: () => "RTDB: " + firebaseConfig.projectId,

  // --- INITIALIZATION ---
  initializeCloud: () => {
    if (isInitialized) return;
    isInitialized = true;
    console.log("[RTDB] Connecting...");

    // 1. Listen to Transactions (/transactions)
    const txRef = ref(db, 'transactions');
    onValue(txRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert Object of Objects -> Array
        localTransactions = Object.values(data);
        console.log(`[RTDB] Loaded ${localTransactions.length} transactions.`);
      } else {
        localTransactions = [];
        console.log("[RTDB] No transactions found (Empty DB).");
      }
      isTxLoaded = true;
      storageService.notifyListeners();
    }, (error) => {
      console.error("[RTDB] Tx Error:", error);
      isTxLoaded = true; // Unblock UI on error
      storageService.notifyListeners();
    });

    // 2. Listen to Configs (/loom_configs)
    const configRef = ref(db, 'loom_configs');
    onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Merge cloud data with defaults to ensure all fields exist
        const newConfigs = { ...DEFAULT_LOOM_CONFIGS };
        Object.keys(data).forEach((key) => {
            if (newConfigs[key as LoomID]) {
                newConfigs[key as LoomID] = data[key];
            }
        });
        localConfigs = newConfigs;
        console.log("[RTDB] Configurations loaded.");
      } else {
        console.log("[RTDB] No configs found. Using Defaults (Read-Only).");
        // We do NOT write to DB here. We just use defaults in memory.
        localConfigs = JSON.parse(JSON.stringify(DEFAULT_LOOM_CONFIGS));
      }
      isConfigLoaded = true;
      storageService.notifyListeners();
    }, (error) => {
      console.error("[RTDB] Config Error:", error);
      isConfigLoaded = true;
      storageService.notifyListeners();
    });
  },

  // --- READ ---
  getTransactions: () => localTransactions,
  getLoomConfigs: () => localConfigs,
  
  // Loading Guard
  getLoadingStatus: () => {
    return !isTxLoaded || !isConfigLoaded;
  },

  // --- WRITE ---
  addTransaction: async (tx: Transaction) => {
    // Optimistic Update (Prevent Duplicate Push)
    if (!localTransactions.find(t => t.id === tx.id)) {
        localTransactions.push(tx);
        storageService.notifyListeners();
    }
    try { 
        await set(ref(db, `transactions/${tx.id}`), tx); 
    } catch (e) { console.error(e); }
  },

  deleteTransaction: async (id: string) => {
    localTransactions = localTransactions.filter(t => t.id !== id);
    storageService.notifyListeners();
    try { 
        await remove(ref(db, `transactions/${id}`)); 
    } catch (e) { console.error(e); }
  },

  updateLoomConfig: async (id: LoomID, updates: Partial<LoomConfig>) => {
    const current = localConfigs[id];
    const updated = { ...current, ...updates };
    localConfigs[id] = updated;
    storageService.notifyListeners();
    // This writes the SPECIFIC Loom ID node
    try { 
        await update(ref(db, `loom_configs/${id}`), updated); 
    } catch (e) { console.error(e); }
  },

  // --- BATCH HELPERS ---
  addTransactionsBatch: async (transactions: Transaction[]) => {
    if (transactions.length === 0) return;
    
    // Optimistic Update with Deduplication
    transactions.forEach(tx => {
        if (!localTransactions.find(t => t.id === tx.id)) {
            localTransactions.push(tx);
        }
    });
    storageService.notifyListeners();

    try {
        // Atomic Multi-Path Update
        const updates: Record<string, any> = {};
        transactions.forEach(tx => {
            updates[`transactions/${tx.id}`] = tx;
        });
        await update(ref(db), updates);
    } catch (e) { console.error(e); }
  },

  // --- ATOMIC BATCH SPLIT ---
  performBatchSplit: async (
    loomId: LoomID, 
    fillers: Transaction[], 
    excessItems: Transaction[]
  ) => {
    console.log("Starting Atomic Batch Split (RTDB)...");
    
    const config = localConfigs[loomId];
    if (!config) throw new Error("Config not found for Loom " + loomId);
    
    const oldBatchId = config.currentBatchId;
    
    // 1. Calculate Balances from OLD Batch Data
    const existingBatchTxs = localTransactions.filter(t => {
        if (String(t.loomId) !== String(loomId)) return false;
        if (t.isArchived) return false;
        if (oldBatchId && oldBatchId.includes('legacy') && !t.batchId) return true;
        if (t.batchId === oldBatchId) return true;
        return false;
    });

    const finalBatchTxs = [...existingBatchTxs, ...fillers];

    const totalProduction = cleanNum(finalBatchTxs.filter(t => t.item === 'SAREE').reduce((sum, t) => sum + t.quantity, 0));
    
    const coneTotalIn = finalBatchTxs.filter(t => t.item === 'CONE' && t.type === 'MATERIAL_IN').reduce((sum, t) => sum + t.quantity, 0);
    const coneUsed = cleanNum(totalProduction * config.coneFactor);
    const finalConeBal = cleanNum(coneTotalIn - coneUsed);

    const jarigaiTotalIn = finalBatchTxs.filter(t => t.item === 'JARIGAI' && t.type === 'MATERIAL_IN').reduce((sum, t) => sum + t.quantity, 0);
    const jarigaiUsed = cleanNum(totalProduction * config.jarigaiFactor);
    const finalJarigaiBal = cleanNum(jarigaiTotalIn - jarigaiUsed);

    // 2. Prepare NEW Batch Config
    const nextBatchNum = (config.batchNumber || 1) + 1;
    const newBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newConfigData = {
        ...config,
        startDate: new Date().toISOString().split('T')[0],
        currentBatchId: newBatchId,
        batchNumber: nextBatchNum
    };

    // 3. Prepare NEW Batch Transactions
    const newTransactions: Transaction[] = [];
    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();

    // Create Opening Balances (Single Entry Check)
    // Note: We create distinct IDs here. 
    if (Math.abs(finalConeBal) > 0.001) {
        newTransactions.push({
            id: crypto.randomUUID(), date: dateStr, billNo: 'OPENING BAL', loomId,
            type: 'MATERIAL_IN', item: 'CONE', quantity: finalConeBal,
            timestamp: timestamp + 5, batchId: newBatchId
        });
    }

    if (Math.abs(finalJarigaiBal) > 0.001) {
        newTransactions.push({
            id: crypto.randomUUID(), date: dateStr, billNo: 'OPENING BAL', loomId,
            type: 'MATERIAL_IN', item: 'JARIGAI', quantity: finalJarigaiBal,
            timestamp: timestamp + 6, batchId: newBatchId
        });
    }

    // Add Excess Items (Single Entry)
    excessItems.forEach((tx, idx) => {
        newTransactions.push({
            ...tx,
            batchId: newBatchId,
            timestamp: timestamp + 10 + idx
        });
    });

    try {
        // --- RTDB ATOMIC MULTI-PATH UPDATE ---
        const updates: Record<string, any> = {};

        // A. Add Fillers to Old Batch
        fillers.forEach(tx => {
            updates[`transactions/${tx.id}`] = tx;
        });

        // B. Archive Old Transactions
        existingBatchTxs.forEach(tx => {
            updates[`transactions/${tx.id}/isArchived`] = true;
        });

        // C. Update Config to New Batch
        updates[`loom_configs/${loomId}`] = newConfigData;

        // D. Add New Batch Transactions
        newTransactions.forEach(tx => {
            updates[`transactions/${tx.id}`] = tx;
        });
        
        // Execute Atomic Write
        await update(ref(db), updates);

        // --- OPTIMISTIC UI UPDATE (With Deduplication) ---
        // 1. Update Config
        localConfigs[loomId] = newConfigData;
        
        // 2. Add Fillers locally (if not exists)
        fillers.forEach(tx => {
            if (!localTransactions.find(t => t.id === tx.id)) localTransactions.push(tx);
        });

        // 3. Archive existing locally
        localTransactions.forEach(tx => {
            if (finalBatchTxs.find(ft => ft.id === tx.id)) {
                tx.isArchived = true;
            }
        });

        // 4. Add New Transactions locally (if not exists)
        newTransactions.forEach(tx => {
            if (!localTransactions.find(t => t.id === tx.id)) localTransactions.push(tx);
        });

        storageService.notifyListeners();
        return newBatchId;

    } catch (e) {
        console.error("Critical Error in Batch Split (RTDB):", e);
        throw e;
    }
  },

  // --- REACT SYNC ---
  subscribe: (listener: ChangeListener) => {
    listeners.push(listener);
    return () => { const i = listeners.indexOf(listener); if(i > -1) listeners.splice(i, 1); };
  },
  notifyListeners: () => listeners.forEach(l => l()),
  exportData: () => JSON.stringify({ transactions: localTransactions, configs: localConfigs }, null, 2),
  getCloudConfig: () => null, 
  saveCloudConfig: () => {}, 
  importData: () => false 
};