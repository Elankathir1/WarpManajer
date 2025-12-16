import React, { useMemo, useRef, useState } from 'react';
import { LoomID, LoomConfig, Transaction } from '../types';
import { storageService } from '../services/storageService';
import { Download, Package, Layers, Scissors, Settings2, Trash2, Share2, CheckCircle, RotateCcw, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface Props {
  loomId: LoomID;
  transactions: Transaction[];
  config: LoomConfig;
  onUpdate: () => void;
}

export const LoomDashboard: React.FC<Props> = ({ loomId, transactions, config, onUpdate }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // --- THE CORE LOGIC (Formulas) ---
  const filteredData = useMemo(() => {
    const currentBatchId = config.currentBatchId;
    // Strict mode ignores legacy untagged data if we are in a 'batch_' cycle
    const isStrictMode = currentBatchId && currentBatchId.startsWith('batch_') && !currentBatchId.includes('legacy');

    return transactions.filter(t => {
      if (String(t.loomId) !== String(loomId)) return false;
      if (t.isArchived) return false;
      
      if (isStrictMode) {
          // If we are in a strict batch, only show items with matching batchId
          return t.batchId === currentBatchId;
      } else {
          // Legacy Mode: Show items with NO batchId OR items matching current legacy id
          if (!t.batchId) return true;
          return t.batchId === currentBatchId;
      }
    }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [transactions, loomId, config.currentBatchId]);

  const stats = useMemo(() => {
    const totalSarees = filteredData
      .filter(t => t.item === 'SAREE')
      .reduce((sum, t) => sum + t.quantity, 0);

    const pendingSarees = Math.max(0, config.targetQty - totalSarees);

    // --- CONE CALCS ---
    const coneOpening = filteredData
      .filter(t => t.item === 'CONE' && t.billNo === 'OPENING BAL')
      .reduce((sum, t) => sum + t.quantity, 0);

    const coneReceived = filteredData
      .filter(t => t.item === 'CONE' && t.type === 'MATERIAL_IN' && t.billNo !== 'OPENING BAL' && t.quantity >= 0)
      .reduce((sum, t) => sum + t.quantity, 0);

    const coneReturned = filteredData
      .filter(t => t.item === 'CONE' && t.type === 'MATERIAL_IN' && t.billNo !== 'OPENING BAL' && t.quantity < 0)
      .reduce((sum, t) => sum + Math.abs(t.quantity), 0);

    const coneUsed = totalSarees * config.coneFactor;
    const coneBalance = (coneOpening + coneReceived) - coneReturned - coneUsed;

    // --- JARIGAI CALCS ---
    const jarigaiOpening = filteredData
      .filter(t => t.item === 'JARIGAI' && t.billNo === 'OPENING BAL')
      .reduce((sum, t) => sum + t.quantity, 0);

    const jarigaiReceived = filteredData
      .filter(t => t.item === 'JARIGAI' && t.type === 'MATERIAL_IN' && t.billNo !== 'OPENING BAL' && t.quantity >= 0)
      .reduce((sum, t) => sum + t.quantity, 0);

    const jarigaiReturned = filteredData
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
  }, [filteredData, config]);

  const isBatchComplete = stats.totalSarees >= config.targetQty;

  // --- ACTIONS ---
  
  const handleConfigChange = (field: keyof LoomConfig, value: string | number) => {
    const updates: Partial<LoomConfig> = { [field]: value };
    storageService.updateLoomConfig(loomId, updates);
    onUpdate();
  };

  const downloadPDF = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    
    const element = reportRef.current;
    const buttons = element.querySelectorAll('button');
    buttons.forEach(b => b.style.display = 'none');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`LOOM-${loomId}_BATCH_${config.batchNumber}_${config.startDate}.pdf`);
    } catch (e) {
      console.error("PDF Error:", e);
      alert("Failed to generate PDF");
    } finally {
      buttons.forEach(b => b.style.display = '');
      setIsGeneratingPdf(false);
    }
  };

  /**
   * RESET STRATEGY: 
   * Uses performBatchSplit with empty arrays to trigger simple archive + balance carry forward.
   * This unifies the logic with the Transaction Form split.
   */
  const performReset = async () => {
    try {
      setIsResetting(true);
      
      // We pass empty arrays for fillers and excess. 
      // The Service logic AUTOMATICALLY calculates the Cone/Jarigai carry forward.
      await storageService.performBatchSplit(loomId, [], []);

      console.log("Reset complete.");
      onUpdate();
      
    } catch (e) {
      console.error("Reset Failed:", e);
      alert("Error during reset. Please try again.");
    } finally {
        setIsResetting(false);
    }
  };

  const handleFinishBatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("✅ COMPLETE BATCH?\n\nThis will archive current data.\n\nMaterial Balances will be CARRIED FORWARD to the next batch.\n\nContinue?")) {
      performReset();
    }
  };

  const handleManualReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(confirm("⚠️ FORCE RESET\n\nThis will archive ALL active data for this loom and start a fresh batch.\n\nMaterial Balances will be CARRIED FORWARD.\n\nAre you sure?")) {
      performReset();
    }
  };

  const deleteTx = (id: string) => {
    if (confirm("Delete this entry?")) {
      storageService.deleteTransaction(id);
      onUpdate();
    }
  };

  // Helper for Stock Blinking
  const getStockClasses = (bal: number) => {
    // Zero: neutral
    if (Math.abs(bal) < 0.001) return 'border-slate-200 text-slate-700';
    
    // Negative: Red Blinking
    if (bal < 0) return 'border-red-400 bg-red-50 text-red-700 animate-pulse';
    
    // Positive: Green Blinking
    return 'border-emerald-400 bg-emerald-50 text-emerald-700 animate-pulse';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* BATCH COMPLETION BANNER */}
      {isBatchComplete && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-bounce-slight">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-emerald-900 text-lg">Batch Target Reached!</h3>
              <p className="text-emerald-700 text-sm">
                Production: {stats.totalSarees} / {config.targetQty}.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <button
                type="button"
                onClick={downloadPDF}
                disabled={isGeneratingPdf || isResetting}
                className="flex-1 md:flex-none px-4 py-3 bg-white border border-emerald-200 text-emerald-700 font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 hover:bg-emerald-50 cursor-pointer"
             >
                <Download className="w-4 h-4" />
                {isGeneratingPdf ? '...' : 'PDF'}
             </button>
             <button
                type="button"
                onClick={handleFinishBatch}
                disabled={isResetting}
                className={`flex-[2] md:flex-none px-6 py-3 font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-white cursor-pointer
                  ${isResetting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}
                `}
            >
                {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                {isResetting ? 'Saving...' : 'Archive & Restart'}
            </button>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-700">Settings - Batch #{config.batchNumber || 1}</h3>
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              ID: {config.currentBatchId?.slice(-6) || 'N/A'}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={handleManualReset}
              disabled={isResetting}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-bold text-xs border border-red-100 uppercase tracking-wide disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Force Reset
            </button>
            <button 
              type="button"
              onClick={downloadPDF}
              disabled={isGeneratingPdf || isResetting}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-xs border border-indigo-100 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              {isGeneratingPdf ? '...' : 'PDF'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Start Date</label>
            <input 
              type="date" 
              className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              value={config.startDate}
              onChange={(e) => handleConfigChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Target Qty</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              value={config.targetQty}
              onChange={(e) => handleConfigChange('targetQty', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cone (kg/saree)</label>
            <input 
              type="number" step="0.001"
              className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              value={config.coneFactor}
              onChange={(e) => handleConfigChange('coneFactor', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Jarigai (kg/saree)</label>
            <input 
              type="number" step="0.001"
              className="w-full p-2 border rounded bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              value={config.jarigaiFactor}
              onChange={(e) => handleConfigChange('jarigaiFactor', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* The Printable Report Area */}
      <div ref={reportRef} className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
        
        <div className="flex justify-between items-end border-b pb-4 border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">LOOM {loomId} REPORT</h2>
            <div className="flex gap-4 text-sm text-slate-500">
                <p>Batch #{config.batchNumber || 1}</p>
                <p>Start: {format(new Date(config.startDate), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-500">Progress</div>
            <div className={`text-3xl font-bold ${isBatchComplete ? 'text-green-600' : 'text-indigo-600'}`}>
              {stats.totalSarees} <span className="text-lg text-slate-400">/ {config.targetQty}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid (Outputs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* PRODUCTION CARD */}
          <div className={`bg-white p-5 rounded-lg shadow-sm border-l-4 ${isBatchComplete ? 'border-green-500' : 'border-indigo-500'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Scissors className={`w-5 h-5 ${isBatchComplete ? 'text-green-600' : 'text-indigo-600'}`} />
              <h4 className="font-bold text-slate-700">Production</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Produced</span>
                <span className="font-bold text-slate-800">{stats.totalSarees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pending</span>
                <span className="font-bold text-amber-600">{stats.pendingSarees}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-2">
                <div 
                  className={`${isBatchComplete ? 'bg-green-500' : 'bg-indigo-500'} h-2 rounded-full transition-all duration-500`} 
                  style={{ width: `${Math.min(100, (stats.totalSarees / config.targetQty) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* CONE CARD */}
          <div className={`bg-white p-5 rounded-lg shadow-sm border-2 ${getStockClasses(stats.coneBalance)}`}>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 opacity-75" />
              <h4 className="font-bold">Cone Stock (kg)</h4>
            </div>
            <div className="space-y-2 text-sm opacity-90">
              <div className="flex justify-between">
                <span>1. Opening</span>
                <span>{stats.coneOpening > 0 ? '+' : ''}{stats.coneOpening.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>2. Return</span>
                <span>{stats.coneReturned > 0 ? '-' : ''}{stats.coneReturned.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>3. Received</span>
                <span className="font-medium">+{stats.coneReceived.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>4. Used (Calc)</span>
                <span className="font-medium">-{stats.coneUsed.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t flex justify-between text-base">
                <span className="font-bold">Balance</span>
                <span className="font-bold">
                  {stats.coneBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* JARIGAI CARD */}
          <div className={`bg-white p-5 rounded-lg shadow-sm border-2 ${getStockClasses(stats.jarigaiBalance)}`}>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 opacity-75" />
              <h4 className="font-bold">Jarigai Stock (kg)</h4>
            </div>
            <div className="space-y-2 text-sm opacity-90">
              <div className="flex justify-between">
                <span>1. Opening</span>
                <span>{stats.jarigaiOpening > 0 ? '+' : ''}{stats.jarigaiOpening.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>2. Return</span>
                <span>{stats.jarigaiReturned > 0 ? '-' : ''}{stats.jarigaiReturned.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>3. Received</span>
                <span className="font-medium">+{stats.jarigaiReceived.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>4. Used (Calc)</span>
                <span className="font-medium">-{stats.jarigaiUsed.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t flex justify-between text-base">
                <span className="font-bold">Balance</span>
                <span className="font-bold">
                  {stats.jarigaiBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table (Filtered) */}
        <div className="mt-8">
          <h4 className="font-bold text-slate-700 mb-4">Batch Transactions</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-200 text-slate-700 uppercase font-bold text-xs">
                <tr>
                  <th className="p-3 rounded-tl-lg">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Bill No</th>
                  <th className="p-3 rounded-tr-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No active data found in this batch.
                    </td>
                  </tr>
                )}
                {filteredData.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="p-3">{format(new Date(tx.date), 'dd/MM/yy')}</td>
                    <td className="p-3">
                      {/* TYPE BADGE LOGIC */}
                      {tx.billNo === 'OPENING BAL' ? (
                         <span className="px-2 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700">OPEN</span>
                      ) : tx.quantity < 0 ? (
                         <span className="px-2 py-1 rounded text-xs font-bold bg-rose-100 text-rose-700">RETURN</span>
                      ) : tx.type === 'MATERIAL_IN' ? (
                         <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800">IN</span>
                      ) : (
                         <span className="px-2 py-1 rounded text-xs font-bold bg-indigo-100 text-indigo-800">OUT</span>
                      )}
                    </td>
                    <td className="p-3 font-medium">
                        {/* ITEM DISPLAY LOGIC */}
                        {tx.billNo === 'OPENING BAL' ? (
                             <span className="text-slate-700 font-bold">CARRY FORWARD {tx.item}</span>
                        ) : tx.quantity < 0 ? (
                            <span className="text-rose-700 font-bold">RETURN {tx.item}</span>
                        ) : (
                            tx.item
                        )}
                    </td>
                    <td className={`p-3 font-mono ${tx.quantity < 0 ? 'text-rose-600 font-bold' : ''}`}>
                        {tx.quantity}
                    </td>
                    <td className="p-3 text-slate-500">{tx.billNo || '-'}</td>
                    <td className="p-3 text-right">
                      {tx.billNo !== 'OPENING BAL' && (
                        <button 
                            onClick={() => deleteTx(tx.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete Entry"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};