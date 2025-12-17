import React, { useMemo, useState } from 'react';
import { LoomID, LoomConfig, Transaction } from '../types';
import { storageService } from '../services/storageService';
import { Download, Package, Layers, Scissors, Settings2, Trash2, Share2, CheckCircle, RotateCcw, Loader2, Archive, CalendarRange } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface Props {
  loomId: LoomID;
  transactions: Transaction[];
  config: LoomConfig;
  onUpdate: () => void;
}

// --- COLOR THEMES ---
const THEMES = {
  current: { 
    name: 'Current',
    border: 'border-indigo-500', 
    bg: 'bg-white', 
    headerBg: 'bg-indigo-50', 
    text: 'text-indigo-900', 
    icon: 'text-indigo-600', 
    badge: 'bg-indigo-100 text-indigo-800' 
  },
  0: { 
    name: 'Last Batch',
    border: 'border-emerald-500', 
    bg: 'bg-slate-50', 
    headerBg: 'bg-emerald-50', 
    text: 'text-emerald-900', 
    icon: 'text-emerald-600', 
    badge: 'bg-emerald-100 text-emerald-800' 
  },
  1: { 
    name: 'Previous Batch',
    border: 'border-amber-500', 
    bg: 'bg-slate-50', 
    headerBg: 'bg-amber-50', 
    text: 'text-amber-900', 
    icon: 'text-amber-600', 
    badge: 'bg-amber-100 text-amber-800' 
  },
  2: { 
    name: 'Older Batch',
    border: 'border-rose-500', 
    bg: 'bg-slate-50', 
    headerBg: 'bg-rose-50', 
    text: 'text-rose-900', 
    icon: 'text-rose-600', 
    badge: 'bg-rose-100 text-rose-800' 
  }
};

// --- HELPER: CALCULATE STATS ---
const getBatchStats = (batchTxs: Transaction[], config: LoomConfig) => {
  const totalSarees = batchTxs
    .filter(t => t.item === 'SAREE')
    .reduce((sum, t) => sum + t.quantity, 0);

  const pendingSarees = Math.max(0, config.targetQty - totalSarees);

  // --- CONE CALCS ---
  const coneOpening = batchTxs
    .filter(t => t.item === 'CONE' && t.billNo === 'OPENING BAL')
    .reduce((sum, t) => sum + t.quantity, 0);

  const coneReceived = batchTxs
    .filter(t => t.item === 'CONE' && t.type === 'MATERIAL_IN' && t.billNo !== 'OPENING BAL' && t.quantity >= 0)
    .reduce((sum, t) => sum + t.quantity, 0);

  const coneReturned = batchTxs
    .filter(t => t.item === 'CONE' && t.type === 'MATERIAL_IN' && t.billNo !== 'OPENING BAL' && t.quantity < 0)
    .reduce((sum, t) => sum + Math.abs(t.quantity), 0);

  const coneUsed = totalSarees * config.coneFactor;
  const coneBalance = (coneOpening + coneReceived) - coneReturned - coneUsed;

  // --- JARIGAI CALCS ---
  const jarigaiOpening = batchTxs
    .filter(t => t.item === 'JARIGAI' && t.billNo === 'OPENING BAL')
    .reduce((sum, t) => sum + t.quantity, 0);

  const jarigaiReceived = batchTxs
    .filter(t => t.item === 'JARIGAI' && t.type === 'MATERIAL_IN' && t.billNo !== 'OPENING BAL' && t.quantity >= 0)
    .reduce((sum, t) => sum + t.quantity, 0);

  const jarigaiReturned = batchTxs
    .filter(t => t.item === 'JARIGAI' && t.type === 'MATERIAL_IN' && t.billNo !== 'OPENING BAL' && t.quantity < 0)
    .reduce((sum, t) => sum + Math.abs(t.quantity), 0);

  const jarigaiUsed = totalSarees * config.jarigaiFactor;
  const jarigaiBalance = (jarigaiOpening + jarigaiReceived) - jarigaiReturned - jarigaiUsed;

  return {
    totalSarees,
    pendingSarees,
    coneOpening,
    coneReceived,
    coneReturned,
    coneUsed,
    coneBalance,
    jarigaiOpening,
    jarigaiReceived,
    jarigaiReturned,
    jarigaiUsed,
    jarigaiBalance
  };
};

// --- SUB-COMPONENT: BATCH CARD ---
const BatchView: React.FC<{
  batchId: string;
  transactions: Transaction[];
  config: LoomConfig;
  isCurrent: boolean;
  themeIdx: number | 'current';
  onDelete?: (id: string) => void;
  onFinish?: (e: React.MouseEvent) => void;
  isResetting?: boolean;
}> = ({ batchId, transactions, config, isCurrent, themeIdx, onDelete, onFinish, isResetting }) => {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const theme = themeIdx === 'current' ? THEMES.current : THEMES[themeIdx as 0|1|2] || THEMES[2];
  const stats = getBatchStats(transactions, config);
  const isTargetReached = isCurrent && stats.totalSarees >= config.targetQty;
  
  // Sort by date desc
  const sortedTxs = [...transactions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  
  // Date Range
  const timestamps = sortedTxs.map(t => t.timestamp || 0).filter(t => t > 0);
  const minDate = timestamps.length ? new Date(Math.min(...timestamps)) : null;
  const maxDate = timestamps.length ? new Date(Math.max(...timestamps)) : null;
  const dateRange = minDate && maxDate 
    ? `${format(minDate, 'dd MMM')} - ${format(maxDate, 'dd MMM yyyy')}`
    : 'New Batch';

  const reportId = `batch-report-${batchId}`;

  const downloadPDF = async () => {
    const element = document.getElementById(reportId);
    if (!element) return;
    setIsPdfLoading(true);
    
    // Hide buttons during capture
    const buttons = element.querySelectorAll('button, .no-print');
    buttons.forEach(b => (b as HTMLElement).style.display = 'none');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`BATCH_REPORT_${batchId.slice(-6)}.pdf`);
    } catch (e) {
      console.error("PDF Error:", e);
      alert("Failed to generate PDF");
    } finally {
      buttons.forEach(b => (b as HTMLElement).style.display = '');
      setIsPdfLoading(false);
    }
  };

  // Stock Helper
  const getStockClasses = (bal: number) => {
    if (Math.abs(bal) < 0.001) return 'border-slate-200 text-slate-700';
    if (bal < 0) return 'border-red-400 bg-red-50 text-red-700';
    return 'border-emerald-400 bg-emerald-50 text-emerald-700';
  };

  return (
    <div id={reportId} className={`rounded-xl border-2 overflow-hidden shadow-sm ${theme.border} ${theme.bg} mb-8 transition-all`}>
      {/* HEADER */}
      <div className={`p-4 ${theme.headerBg} border-b ${theme.border} flex flex-col md:flex-row justify-between md:items-center gap-4`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/50 ${theme.text}`}>
            {isCurrent ? <CheckCircle className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
                <h3 className={`font-bold text-lg ${theme.text}`}>
                    {theme.name}
                </h3>
                {!isCurrent && <span className="text-xs font-mono text-slate-400 px-1 border rounded bg-white">
                    {batchId.slice(-4)}
                </span>}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <CalendarRange className="w-4 h-4" />
                {dateRange}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
             {/* Progress (Only visible if active or large count) */}
            <div className="text-right mr-2">
                <div className="text-xs uppercase font-bold text-slate-400">Production</div>
                <div className={`text-xl font-bold ${theme.text}`}>
                   {stats.totalSarees} <span className="text-sm opacity-60">Sarees</span>
                </div>
            </div>

            <button 
                onClick={downloadPDF} 
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Download PDF"
            >
                {isPdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </button>
            
            {isCurrent && onFinish && (
                <button
                    onClick={onFinish}
                    disabled={isResetting}
                    className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg text-white shadow-sm transition-all
                        ${isTargetReached ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' : 'bg-slate-700 hover:bg-slate-800'}
                    `}
                >
                    {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    {isTargetReached ? 'Finish Batch' : 'Close Batch'}
                </button>
            )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PRODUCTION */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                 <div className="flex items-center gap-2 mb-2 text-slate-600">
                    <Scissors className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase">Sarees</span>
                 </div>
                 <div className="text-3xl font-bold text-slate-800">{stats.totalSarees}</div>
                 {isCurrent && (
                     <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                           className={`h-full ${isTargetReached ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all`}
                           style={{ width: `${Math.min(100, (stats.totalSarees / config.targetQty) * 100)}%` }}
                        />
                     </div>
                 )}
                 {isCurrent && (
                     <div className="mt-1 text-xs text-slate-400 font-medium">Target: {config.targetQty}</div>
                 )}
            </div>

            {/* CONE */}
            <div className={`bg-white p-4 rounded-lg border-2 shadow-sm ${getStockClasses(stats.coneBalance)}`}>
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Package className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase">Cone</span>
                    </div>
                    <div className="text-xs font-mono bg-slate-100 px-1 rounded">IN: {stats.coneReceived.toFixed(1)}</div>
                 </div>
                 <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{stats.coneBalance.toFixed(2)}</span>
                    <span className="text-xs font-bold opacity-60">kg</span>
                 </div>
                 <div className="mt-1 text-xs opacity-70">Used: {stats.coneUsed.toFixed(2)}</div>
            </div>

            {/* JARIGAI */}
            <div className={`bg-white p-4 rounded-lg border-2 shadow-sm ${getStockClasses(stats.jarigaiBalance)}`}>
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Layers className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase">Jarigai</span>
                    </div>
                    <div className="text-xs font-mono bg-slate-100 px-1 rounded">IN: {stats.jarigaiReceived.toFixed(1)}</div>
                 </div>
                 <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{stats.jarigaiBalance.toFixed(2)}</span>
                    <span className="text-xs font-bold opacity-60">kg</span>
                 </div>
                 <div className="mt-1 text-xs opacity-70">Used: {stats.jarigaiUsed.toFixed(2)}</div>
            </div>
        </div>

        {/* TABLE */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-xs">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 hidden sm:table-cell">Bill</th>
                  {isCurrent && <th className="p-3 text-right w-10">Del</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTxs.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-400">No transactions</td></tr>
                )}
                {sortedTxs.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600 whitespace-nowrap">{format(new Date(tx.date), 'dd/MM/yy')}</td>
                    <td className="p-3 font-medium">
                       {tx.item}
                       {tx.billNo === 'OPENING BAL' && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1 rounded border">FWD</span>}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${tx.quantity < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {tx.quantity}
                    </td>
                    <td className="p-3 text-slate-400 text-xs hidden sm:table-cell">{tx.billNo}</td>
                    {isCurrent && (
                        <td className="p-3 text-right no-print">
                            {tx.billNo !== 'OPENING BAL' && onDelete && (
                                <button onClick={() => onDelete(tx.id)} className="text-slate-300 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};


export const LoomDashboard: React.FC<Props> = ({ loomId, transactions, config, onUpdate }) => {
  const [isResetting, setIsResetting] = useState(false);

  // --- ACTIONS ---
  const handleConfigChange = (field: keyof LoomConfig, value: string | number) => {
    const updates: Partial<LoomConfig> = { [field]: value };
    storageService.updateLoomConfig(loomId, updates);
    onUpdate();
  };

  const performReset = async () => {
    try {
      setIsResetting(true);
      await storageService.performBatchSplit(loomId, [], []);
      onUpdate();
    } catch (e) {
      console.error("Reset Failed:", e);
      alert("Error during reset.");
    } finally {
        setIsResetting(false);
    }
  };

  const handleFinishBatch = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("✅ COMPLETE BATCH?\n\nThis will archive current data and start a new batch.\n\nMaterial Balances will be CARRIED FORWARD.\n\nContinue?")) {
      performReset();
    }
  };

  const handleManualReset = () => {
    if(confirm("⚠️ FORCE RESET\n\nAre you sure you want to force start a new batch?")) {
      performReset();
    }
  };

  const deleteTx = (id: string) => {
    if (confirm("Delete this entry?")) {
      storageService.deleteTransaction(id);
      onUpdate();
    }
  };

  // --- DATA GROUPING ---
  const { currentBatch, historyBatches } = useMemo(() => {
     const allLoomTxs = transactions.filter(t => String(t.loomId) === String(loomId));
     const currentBatchId = config.currentBatchId;
     const groups: Record<string, Transaction[]> = {};
     
     // 1. Group all txs by batchId
     allLoomTxs.forEach(tx => {
         let bId = tx.batchId;
         // Legacy handling: If no batch ID, try to map to current if current is legacy
         if (!bId) {
             bId = (currentBatchId && currentBatchId.includes('legacy')) 
                ? currentBatchId 
                : 'legacy_archive';
         }
         if (!groups[bId]) groups[bId] = [];
         groups[bId].push(tx);
     });

     // 2. Identify Current vs History
     const currentTxs = currentBatchId ? (groups[currentBatchId] || []) : [];
     
     // 3. Process History
     const history = Object.keys(groups)
        .filter(id => id !== currentBatchId)
        .map(id => ({
            id,
            txs: groups[id],
            lastActive: Math.max(...groups[id].map(t => t.timestamp || 0))
        }))
        .sort((a, b) => b.lastActive - a.lastActive) // Newest first
        .slice(0, 3); // Take top 3

     return { currentBatch: currentTxs, historyBatches: history };
  }, [transactions, loomId, config.currentBatchId]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* GLOBAL SETTINGS (Current Batch) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-700">Loom Configuration</h3>
          </div>
          <button 
             onClick={handleManualReset}
             className="text-xs text-red-500 font-bold border border-red-100 bg-red-50 px-3 py-1 rounded hover:bg-red-100"
          >
             FORCE RESET
          </button>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Start Date</label>
            <input 
              type="date" 
              className="w-full p-2 border rounded bg-slate-50 text-sm font-medium"
              value={config.startDate}
              onChange={(e) => handleConfigChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Target Qty</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded bg-slate-50 text-sm font-medium"
              value={config.targetQty}
              onChange={(e) => handleConfigChange('targetQty', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cone Factor</label>
            <input 
              type="number" step="0.001"
              className="w-full p-2 border rounded bg-slate-50 text-sm font-medium"
              value={config.coneFactor}
              onChange={(e) => handleConfigChange('coneFactor', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Jarigai Factor</label>
            <input 
              type="number" step="0.001"
              className="w-full p-2 border rounded bg-slate-50 text-sm font-medium"
              value={config.jarigaiFactor}
              onChange={(e) => handleConfigChange('jarigaiFactor', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* 1. CURRENT BATCH */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        <BatchView 
            batchId={config.currentBatchId || 'new'}
            transactions={currentBatch}
            config={config}
            isCurrent={true}
            themeIdx="current"
            onDelete={deleteTx}
            onFinish={handleFinishBatch}
            isResetting={isResetting}
        />
      </div>

      {/* 2. HISTORY BATCHES */}
      {historyBatches.length > 0 && (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-400 px-2">
                <History className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Recently Completed</h3>
            </div>
            
            {historyBatches.map((batch, idx) => (
                <div key={batch.id} className="animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${(idx + 1) * 100}ms` }}>
                    <BatchView 
                        batchId={batch.id}
                        transactions={batch.txs}
                        config={config} // Uses current config factors for history (limitation)
                        isCurrent={false}
                        themeIdx={idx as 0|1|2}
                    />
                </div>
            ))}
        </div>
      )}
    </div>
  );
};