
import { Batch, BatchResponse, LoomID, Transaction, LoomConfig } from '../types';
import { storageService } from './storageService';

const BATCH_COLORS = [
  '#f0fdf4', // Emerald Light
  '#fff7ed', // Orange Light
  '#f5f3ff', // Violet Light
  '#f0f9ff', // Sky Light
  '#fdf2f8', // Pink Light
  '#fff1f2', // Rose Light
  '#faf5ff', // Purple Light
  '#f0fdfa', // Teal Light
];

const getBatchColor = (batchNumber: number): string => {
  return BATCH_COLORS[batchNumber % BATCH_COLORS.length];
};

export const fetchBatchData = async (loomId: LoomID): Promise<BatchResponse> => {
  try {
    const allTransactions = storageService.getTransactions();
    const configs = storageService.getLoomConfigs();
    const config = configs[loomId];
    
    const loomTransactions = allTransactions.filter(t => t.loomId === loomId);
    
    // Group transactions by batch number
    const batchesMap: Record<number, Transaction[]> = {};
    loomTransactions.forEach(tx => {
      if (!batchesMap[tx.batchNumber]) batchesMap[tx.batchNumber] = [];
      batchesMap[tx.batchNumber].push(tx);
    });

    const createBatchObject = (batchNumber: number, txs: Transaction[], isCurrent: boolean): Batch => {
      const sortedTxs = [...txs].sort((a, b) => a.timestamp - b.timestamp);
      
      const produced = txs.filter(t => t.type === 'PRODUCTION').reduce((a, b) => a + b.value, 0);
      const openingCone = txs.find(t => t.type === 'CONE_OPENING')?.value || 0;
      const openingJarigai = txs.find(t => t.type === 'JARIGAI_OPENING')?.value || 0;
      
      const receivedCone = txs.filter(t => t.type === 'CONE_RECEIPT').reduce((a, b) => a + b.value, 0);
      const receivedJarigai = txs.filter(t => t.type === 'JARIGAI_RECEIPT').reduce((a, b) => a + b.value, 0);
      
      const returnedCone = txs.filter(t => t.type === 'CONE_RETURN').reduce((a, b) => a + b.value, 0);
      const returnedJarigai = txs.filter(t => t.type === 'JARIGAI_RETURN').reduce((a, b) => a + b.value, 0);
      
      const consumedCone = produced * config.coneUsageFactor;
      const consumedJarigai = produced * config.jarigaiUsageFactor;
      
      const closingCone = openingCone + receivedCone - consumedCone - returnedCone;
      const closingJarigai = openingJarigai + receivedJarigai - consumedJarigai - returnedJarigai;

      return {
        id: `batch-${loomId}-${batchNumber}`,
        loomId,
        batchNumber,
        target: config.target, // Historically we use the current target for simplicity, or we could store historical targets
        produced,
        remaining: Math.max(0, config.target - produced),
        status: isCurrent ? 'current' : 'completed',
        color: getBatchColor(batchNumber),
        startTime: sortedTxs[0]?.timestamp || Date.now(),
        endTime: isCurrent ? undefined : sortedTxs[sortedTxs.length - 1]?.timestamp,
        
        openingCone,
        openingJarigai,
        receivedCone,
        receivedJarigai,
        returnedCone,
        returnedJarigai,
        consumedCone,
        consumedJarigai,
        closingCone,
        closingJarigai
      };
    };

    const currentBatchNumber = config.batchNumber;
    const currentBatch = batchesMap[currentBatchNumber] 
      ? createBatchObject(currentBatchNumber, batchesMap[currentBatchNumber], true)
      : createBatchObject(currentBatchNumber, [], true); // Fallback for new empty batch

    const completedBatches = Object.keys(batchesMap)
      .map(Number)
      .filter(bn => bn < currentBatchNumber)
      .sort((a, b) => b - a)
      .map(bn => createBatchObject(bn, batchesMap[bn], false));

    return {
      current_batch: currentBatch,
      last_three_completed: completedBatches.slice(0, 3)
    };
  } catch (error) {
    console.error("Error fetching batch data:", error);
    return { current_batch: null, last_three_completed: [] };
  }
};
