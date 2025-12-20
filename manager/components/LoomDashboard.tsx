
import React, { useState, useEffect, useMemo } from 'react';
import { LoomID, LoomConfig, Transaction, BatchResponse, Batch } from '../types';
import { Package, Scissors, TrendingUp, FileDown, Dna, Clock, Settings, RefreshCcw, Save, Lock, Edit3, History, Calendar, ShieldAlert, Trash2 } from 'lucide-react';
import { fetchBatchData } from '../services/batchService';
import { generateLoomReportPDF } from '../services/pdfService';
import { storageService } from '../services/storageService';
import clsx from 'clsx';

interface LoomDashboardProps {
  loomId: LoomID;
  transactions: Transaction[];
  config: LoomConfig;
  onUpdate: () => void;
}

/**
 * Enhanced Batch Card component showing full material audit and production stats
 */
const BatchCard = ({ batch, isCurrent, onExport }: { 
  batch: Batch, 
  isCurrent: boolean, 
  onExport: (b: Batch) => void
}) => {
  return (
    <div 
      className={clsx(
        "p-5 rounded-2xl border transition-all hover:shadow-lg flex flex-col gap-4 relative overflow-hidden h-full min-h-[320px]",
        isCurrent ? "ring-4 ring-indigo-500/20 border-indigo-500 shadow-xl bg-white" : "border-slate-200 bg-white"
      )}
      style={{ backgroundColor: isCurrent ? undefined : batch.color }}
    >
      {isCurrent && (
        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-tighter z-10">
          Current Active
        </div>
      )}
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Production Cycle</div>
          <h4 className="text-lg md:text-xl font-black text-slate-800">Batch #{batch.batchNumber}</h4>
        </div>
        <button 
          onClick={() => onExport(batch)}
          className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-md active:scale-95 shrink-0"
          title="Download Batch Report"
        >
          <FileDown className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 relative z-10">
        <div className="bg-white/60 p-2.5 rounded-xl border border-black/5">
           <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Sarees Done</div>
           <div className="text-base md:text-lg font-black text-slate-800">{batch.produced} <span className="text-[10px] font-normal text-slate-400">/ {batch.target}</span></div>
        </div>
        <div className="bg-white/60 p-2.5 rounded-xl border border-black/5 text-right sm:text-left">
           <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Remaining</div>
           <div className="text-base md:text-lg font-black text-rose-500">{batch.remaining}</div>
        </div>
      </div>

      <div className="space-y-2 relative z-10 pt-2">
        <div className="flex justify-between items-center text-[10px] md:text-[11px] pb-1.5 border-b border-black/5">
          <span className="text-slate-500 font-bold uppercase tracking-tighter shrink-0">Opening Bal</span>
          <span className="font-mono text-slate-700 text-right">{batch.openingCone.toFixed(1)} | {batch.openingJarigai.toFixed(1)} <span className="text-[9px] text-slate-400">kg</span></span>
        </div>
        <div className="flex justify-between items-center text-[10px] md:text-[11px] pb-1.5 border-b border-black/5">
          <span className="text-slate-500 font-bold uppercase tracking-tighter shrink-0">Closing Bal</span>
          <span className="font-mono text-emerald-600 font-black text-right">{batch.closingCone.toFixed(1)} | {batch.closingJarigai.toFixed(1)} <span className="text-[9px] text-slate-400">kg</span></span>
        </div>
        <div className="flex justify-between items-center text-[10px] md:text-[11px] pb-1.5 border-b border-black/5">
          <span className="text-slate-500 font-bold uppercase tracking-tighter shrink-0">Batch Used</span>
          <span className="font-mono text-slate-600 text-right">{batch.consumedCone.toFixed(1)} | {batch.consumedJarigai.toFixed(1)} <span className="text-[9px] text-slate-400">kg</span></span>
        </div>
      </div>

      <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-slate-400 font-bold uppercase">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(batch.startTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
        {!isCurrent && batch.endTime && (
          <div className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Completed</div>
        )}
      </div>
    </div>
  );
};

export const LoomDashboard: React.FC<LoomDashboardProps> = ({ loomId, transactions, config, onUpdate }) => {
  const [batchData, setBatchData] = useState<BatchResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editTarget, setEditTarget] = useState(config.target.toString());
  const [editConeFactor, setEditConeFactor] = useState(config.coneUsageFactor.toString());
  const [editJarigaiFactor, setEditJarigaiFactor] = useState(config.jarigaiUsageFactor.toString());

  useEffect(() => {
    setEditTarget(config.target.toString());
    setEditConeFactor(config.coneUsageFactor.toString());
    setEditJarigaiFactor(config.jarigaiUsageFactor.toString());
  }, [config]);

  const loomTransactions = transactions.filter(t => t.loomId === loomId && t.batchNumber === config.batchNumber);
  const progressPercent = Math.min((config.current / config.target) * 100, 100);

  const stockBreakdown = useMemo(() => {
    const batchTxs = transactions.filter(t => t.loomId === loomId && t.batchNumber === config.batchNumber);
    
    const coneOpeningTx = batchTxs.find(t => t.type === 'CONE_OPENING');
    const coneOpening = coneOpeningTx ? coneOpeningTx.value : 0;
    
    const jarigaiOpeningTx = batchTxs.find(t => t.type === 'JARIGAI_OPENING');
    const jarigaiOpening = jarigaiOpeningTx ? jarigaiOpeningTx.value : 0;

    const coneReceived = batchTxs.filter(t => t.type === 'CONE_RECEIPT').reduce((a, b) => a + b.value, 0);
    const coneReturned = batchTxs.filter(t => t.type === 'CONE_RETURN').reduce((a, b) => a + b.value, 0);
    
    const jarigaiReceived = batchTxs.filter(t => t.type === 'JARIGAI_RECEIPT').reduce((a, b) => a + b.value, 0);
    const jarigaiReturned = batchTxs.filter(t => t.type === 'JARIGAI_RETURN').reduce((a, b) => a + b.value, 0);

    const coneUsed = batchTxs.filter(t => t.type === 'PRODUCTION').reduce((a, b) => a + (b.value * config.coneUsageFactor), 0);
    const jarigaiUsed = batchTxs.filter(t => t.type === 'PRODUCTION').reduce((a, b) => a + (b.value * config.jarigaiUsageFactor), 0);

    const coneBalance = coneOpening + coneReceived - coneUsed - coneReturned;
    const jarigaiBalance = jarigaiOpening + jarigaiReceived - jarigaiUsed - jarigaiReturned;

    return {
      cone: { opening: coneOpening, received: coneReceived, returned: coneReturned, used: coneUsed, balance: coneBalance },
      jarigai: { opening: jarigaiOpening, received: jarigaiReceived, returned: jarigaiReturned, used: jarigaiUsed, balance: jarigaiBalance }
    };
  }, [transactions, config, loomId]);

  useEffect(() => {
    loadBatches();
  }, [loomId, transactions, config.batchNumber]);

  const loadBatches = async () => {
    const data = await fetchBatchData(loomId);
    setBatchData(data);
  };

  const handleSaveSettings = async () => {
    const target = parseFloat(editTarget);
    const coneFactor = parseFloat(editConeFactor);
    const jarigaiFactor = parseFloat(editJarigaiFactor);
    if (isNaN(target) || isNaN(coneFactor) || isNaN(jarigaiFactor)) {
      alert("Please enter valid numbers.");
      return;
    }
    setIsSaving(true);
    try {
      await storageService.updateLoomSettings(loomId, { target, coneUsageFactor: coneFactor, jarigaiUsageFactor: jarigaiFactor });
      onUpdate();
      setShowSettings(false);
    } catch (e) {
      alert("Failed to save settings.");
    } finally { setIsSaving(false); }
  };

  const handleFactoryReset = async () => {
    const isConfirmed = window.confirm('Are you sure you want to reset all data? This will zero out all looms and batches across the factory.');
    if (!isConfirmed) return;

    const password = window.prompt('Please enter the system password to confirm factory reset:');
    if (password === '1234') {
      setIsSaving(true);
      try {
        await storageService.resetAll(true);
        onUpdate();
        setShowSettings(false);
        alert('System successfully reset to factory defaults.');
      } catch (err) {
        alert('Failed to reset system.');
      } finally {
        setIsSaving(false);
      }
    } else if (password !== null) {
      alert('Incorrect password. Action cancelled.');
    }
  };

  const labelStyle = "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";
  const editInputStyle = "w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-lg text-sm font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all";
  const lockInputStyle = "w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-lg text-sm font-semibold text-slate-400 cursor-not-allowed flex items-center justify-between";

  const BreakdownRow = ({ label, value, isPositive }: { label: string, value: string | number, isPositive?: boolean }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-[13px]">
      <span className="text-slate-500 font-medium shrink-0">{label}</span>
      <span className={clsx("font-bold", isPositive === true ? "text-emerald-600" : isPositive === false ? "text-rose-400" : "text-slate-700")}>
        {isPositive === true ? '+' : isPositive === false ? '-' : ''}{value}
      </span>
    </div>
  );

  const handlePdfExport = async () => {
    if (!batchData?.current_batch) return;
    setIsGeneratingPdf(true);
    try { await generateLoomReportPDF(loomId, batchData.current_batch, transactions); } 
    catch (err) { alert("Failed to generate PDF report."); } 
    finally { setIsGeneratingPdf(false); }
  };

  const handleBatchPdfExport = async (batch: Batch) => {
    try { await generateLoomReportPDF(loomId, batch, transactions); } 
    catch (err) { alert("Failed to generate PDF report."); } 
  };

  // Speedometer angle calculation (Semi-circle: -90 to 90 degrees)
  const baseAngle = (progressPercent * 1.8) - 90;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="px-3 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md">LOOM {loomId}</div>
             <span className="text-[13px] font-bold text-slate-400 uppercase tracking-tight">Active Batch #{config.batchNumber}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Loom Performance</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePdfExport} disabled={isGeneratingPdf} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-[13px] font-bold hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-all">
            <FileDown className="w-4 h-4" /> EXPORT PDF
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className={clsx("flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border shadow-sm", showSettings ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50")}>
            <Settings className={clsx("w-4 h-4", showSettings && "animate-spin-slow")} />
            {showSettings ? 'CLOSE CONFIG' : 'BATCH CONFIG'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white p-5 md:p-6 rounded-2xl border-2 border-indigo-50 shadow-xl shadow-indigo-500/5 animate-fade-in space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
             <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2"><Edit3 className="w-5 h-5 text-indigo-500" /> Adjust Parameters</h3>
             <button onClick={handleSaveSettings} disabled={isSaving} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-lg transition-all active:scale-[0.98]">
                {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} SAVE CHANGES
             </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
            <div><label className={labelStyle}>Batch #</label><div className={lockInputStyle}><span>{config.batchNumber}</span><Lock className="w-3 h-3" /></div></div>
            <div><label className={labelStyle}>Current Prod.</label><div className={lockInputStyle}><span>{config.current}</span><Lock className="w-3 h-3" /></div></div>
            <div><label className={labelStyle}>Target Qty</label><input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className={editInputStyle} /></div>
            <div><label className={labelStyle}>Cone Factor</label><input type="number" step="0.001" value={editConeFactor} onChange={(e) => setEditConeFactor(e.target.value)} className={editInputStyle} /></div>
            <div><label className={labelStyle}>Jarigai Factor</label><input type="number" step="0.001" value={editJarigaiFactor} onChange={(e) => setEditJarigaiFactor(e.target.value)} className={editInputStyle} /></div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h4 className="text-red-600 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Global Danger Zone
              </h4>
              <p className="text-slate-400 text-xs mt-1">Reset all factory looms, batch numbers, and stock to zero. This is irreversible.</p>
            </div>
            <button 
              onClick={handleFactoryReset}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black text-xs hover:bg-rose-600 hover:text-white transition-all shadow-sm uppercase tracking-widest"
            >
              <Trash2 className="w-4 h-4" /> FACTORY RESET SYSTEM
            </button>
          </div>
        </div>
      )}

      {/* 2. Key Metrics Grid (3-Column Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><TrendingUp className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-800">Production Velocity</h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
             {/* Speedometer Gauge */}
             <div className="relative w-full max-w-[208px] aspect-[2/1] overflow-hidden flex items-end justify-center">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                   <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="#f1f5f9" strokeWidth="8" strokeLinecap="round" />
                   <path 
                     d="M 5 50 A 45 45 0 0 1 95 50" 
                     fill="none" 
                     stroke="#6366f1" 
                     strokeWidth="8" 
                     strokeLinecap="round" 
                     strokeDasharray="141.37" 
                     strokeDashoffset={141.37 - (progressPercent / 100) * 141.37}
                     style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                   />
                </svg>

                {/* Shaking Needle */}
                <div 
                   className="absolute bottom-0 w-1 h-[90%] bg-gradient-to-t from-orange-600 to-orange-400 rounded-full animate-needle shadow-md"
                   style={{ 
                     '--base-angle': `${baseAngle}deg`,
                     transform: `rotate(${baseAngle}deg)`,
                     transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                     transformOrigin: '50% 100%'
                   } as React.CSSProperties}
                >
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full blur-[2px] opacity-50" />
                </div>
                <div className="absolute bottom-[-6px] w-4 h-4 bg-slate-800 rounded-full border-2 border-white shadow-lg z-20" />
             </div>

             <div className="text-center mt-4">
                <div className="text-3xl font-black text-slate-800 tracking-tighter">{Math.round(progressPercent)}%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Reached</div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-6">
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <div className={labelStyle}>Produced</div>
                <div className="text-lg md:text-xl font-bold text-slate-800">{config.current}</div>
             </div>
             <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-center">
                <div className={labelStyle}>Target</div>
                <div className="text-lg md:text-xl font-bold text-indigo-700">{config.target}</div>
             </div>
          </div>
        </div>

        {/* Cone Stock Analysis */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Package className="w-5 h-5" /></div> Cone (kg)</h3>
            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0", stockBreakdown.cone.balance < 2 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
              {stockBreakdown.cone.balance < 2 ? "LOW" : "OPTIMAL"}
            </span>
          </div>
          <div className="space-y-1 mb-6">
            <BreakdownRow label="Batch Opening" value={stockBreakdown.cone.opening.toFixed(2)} />
            <BreakdownRow label="Received" value={stockBreakdown.cone.received.toFixed(2)} isPositive={true} />
            <BreakdownRow label="Batch Consumption" value={stockBreakdown.cone.used.toFixed(2)} isPositive={false} />
            <BreakdownRow label="Returned" value={stockBreakdown.cone.returned.toFixed(2)} isPositive={false} />
          </div>
          <div className="pt-4 border-t-2 border-slate-50 flex justify-between items-baseline gap-2">
             <span className="text-[11px] md:text-[13px] font-bold text-slate-400 uppercase">Current Balance</span>
             <span className={clsx("text-2xl md:text-3xl font-bold", stockBreakdown.cone.balance < 0 ? "text-rose-600" : "text-slate-800")}>
               {stockBreakdown.cone.balance.toFixed(2)}
             </span>
          </div>
        </div>

        {/* Jarigai Stock Analysis */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Dna className="w-5 h-5" /></div> Jarigai (kg)</h3>
            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0", stockBreakdown.jarigai.balance < 1 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}>
              {stockBreakdown.jarigai.balance < 1 ? "LOW" : "OPTIMAL"}
            </span>
          </div>
          <div className="space-y-1 mb-6">
            <BreakdownRow label="Batch Opening" value={stockBreakdown.jarigai.opening.toFixed(2)} />
            <BreakdownRow label="Received" value={stockBreakdown.jarigai.received.toFixed(2)} isPositive={true} />
            <BreakdownRow label="Batch Consumption" value={stockBreakdown.jarigai.used.toFixed(2)} isPositive={false} />
            <BreakdownRow label="Returned" value={stockBreakdown.jarigai.returned.toFixed(2)} isPositive={false} />
          </div>
          <div className="pt-4 border-t-2 border-slate-50 flex justify-between items-baseline gap-2">
             <span className="text-[11px] md:text-[13px] font-bold text-slate-400 uppercase">Current Balance</span>
             <span className={clsx("text-2xl md:text-3xl font-bold", stockBreakdown.jarigai.balance < 0 ? "text-rose-600" : "text-slate-800")}>
               {stockBreakdown.jarigai.balance.toFixed(2)}
             </span>
          </div>
        </div>
      </div>

      {/* 3. Transaction Log History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
           <h4 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
             <Clock className="w-5 h-5 text-indigo-500" /> Batch Log History
           </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] min-w-[600px]">
            <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action Type</th>
                <th className="px-6 py-4">Qty / Weight</th>
                <th className="px-6 py-4">Reference Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600">
              {loomTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('en-GB')}</td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap", tx.type === 'PRODUCTION' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600")}>
                      {tx.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                    {tx.type === 'PRODUCTION' ? `${tx.value} Sarees` : `${tx.value.toFixed(2)} kg`}
                  </td>
                  <td className="px-6 py-4 text-slate-400 truncate max-w-[200px]">{tx.note || '--'}</td>
                </tr>
              ))}
              {loomTransactions.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No activity recorded for this batch yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Batch Performance History Cards */}
      <div className="space-y-6 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2 px-1 md:px-2">
           <div className="p-2 bg-indigo-100 rounded-lg shrink-0"><History className="w-5 h-5 text-indigo-600" /></div>
           <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">Cycle History</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {batchData?.current_batch && (
            <BatchCard 
              batch={batchData.current_batch} 
              isCurrent={true} 
              onExport={handleBatchPdfExport} 
            />
          )}

          {batchData?.last_three_completed.map((batch) => (
            <BatchCard 
              key={batch.id}
              batch={batch} 
              isCurrent={false} 
              onExport={handleBatchPdfExport}
            />
          ))}
          
          {(!batchData?.current_batch && batchData?.last_three_completed.length === 0) && (
            <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 italic font-medium">
              No batch history recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
