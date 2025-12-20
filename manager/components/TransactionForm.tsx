
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { LoomID } from '../types';
import { Save, PlusCircle, ChevronDown, Calendar, Package, TrendingUp, Undo2, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

export const TransactionForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loomId, setLoomId] = useState<LoomID>('1');
  const [sareeQty, setSareeQty] = useState<string>('');
  const [sareeBill, setSareeBill] = useState('');
  const [coneQty, setConeQty] = useState<string>('');
  const [jarigaiQty, setJarigaiQty] = useState<string>('');
  const [coneReturnQty, setConeReturnQty] = useState<string>('');
  const [jarigaiReturnQty, setJarigaiReturnQty] = useState<string>('');
  const [materialBill, setMaterialBill] = useState('');
  const [showReturns, setShowReturns] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const transactionsToSave: any[] = [];

    // Production (OUT)
    const sQty = parseFloat(sareeQty);
    if (!isNaN(sQty) && sQty > 0) {
      transactionsToSave.push({ type: 'PRODUCTION', value: sQty, note: sareeBill });
    }

    // Material Receipts (IN)
    const cQty = parseFloat(coneQty);
    if (!isNaN(cQty) && cQty > 0) {
      transactionsToSave.push({ type: 'CONE_RECEIPT', value: cQty, note: materialBill });
    }
    const jQty = parseFloat(jarigaiQty);
    if (!isNaN(jQty) && jQty > 0) {
      transactionsToSave.push({ type: 'JARIGAI_RECEIPT', value: jQty, note: materialBill });
    }

    // Returns
    if (showReturns) {
      const crQty = parseFloat(coneReturnQty);
      if (!isNaN(crQty) && crQty > 0) {
        transactionsToSave.push({ type: 'CONE_RETURN', value: crQty, note: materialBill });
      }
      const jrQty = parseFloat(jarigaiReturnQty);
      if (!isNaN(jrQty) && jrQty > 0) {
        transactionsToSave.push({ type: 'JARIGAI_RETURN', value: jrQty, note: materialBill });
      }
    }

    if (transactionsToSave.length > 0) {
      await storageService.addBatchTransactions(loomId, transactionsToSave);
      setSareeQty('');
      setSareeBill('');
      setConeQty('');
      setJarigaiQty('');
      setConeReturnQty('');
      setJarigaiReturnQty('');
      setMaterialBill('');
      onSuccess();
    }
  };

  const labelStyle = "block text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";
  const sectionTitleStyle = "text-[15px] font-bold text-indigo-800 flex items-center gap-1.5 mb-4";
  const inputStyle = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-[15px] font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-indigo-600" />
        <h3 className="text-[15px] font-bold text-slate-800">New Transaction Entry</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyle}>Entry Date</label>
            <div className="relative">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputStyle} pr-10`} style={{ colorScheme: 'light' }} />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Select Loom</label>
            <div className="relative">
              <select value={loomId} onChange={(e) => setLoomId(e.target.value as LoomID)} className={inputStyle + " appearance-none"}>
                <option value="1">Loom 01</option>
                <option value="2">Loom 02</option>
                <option value="3">Loom 03</option>
                <option value="4">Loom 04</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-indigo-50/30 rounded-lg border border-indigo-100/50">
          <h4 className={sectionTitleStyle}><TrendingUp className="w-4 h-4" /> Production (Output)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="number" value={sareeQty} onChange={(e) => setSareeQty(e.target.value)} className={inputStyle} placeholder="Saree Quantity" />
            <input type="text" value={sareeBill} onChange={(e) => setSareeBill(e.target.value)} className={inputStyle} placeholder="Reference Note" />
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-100 space-y-4">
          <h4 className="text-[15px] font-bold text-slate-700 flex items-center gap-1.5"><Package className="w-4 h-4" /> Raw Material Receipts</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle + " text-emerald-600"}>Cone (kg)</label>
              <input type="number" step="0.01" value={coneQty} onChange={(e) => setConeQty(e.target.value)} className={inputStyle} placeholder="0.00" />
            </div>
            <div>
              <label className={labelStyle + " text-purple-600"}>Jarigai (kg)</label>
              <input type="number" step="0.01" value={jarigaiQty} onChange={(e) => setJarigaiQty(e.target.value)} className={inputStyle} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Toggleable Material Returns */}
        <div className="px-4">
           <button 
             type="button" 
             onClick={() => setShowReturns(!showReturns)}
             className="text-[12px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors uppercase tracking-widest"
           >
             {showReturns ? <ChevronUp className="w-4 h-4" /> : <Undo2 className="w-4 h-4" />}
             {showReturns ? 'Hide Material Returns' : 'Show Material Returns'}
           </button>
        </div>

        {showReturns && (
          <div className="p-4 rounded-lg border border-amber-100 bg-amber-50/20 space-y-4 animate-fade-in">
            <h4 className="text-[15px] font-bold text-amber-700 flex items-center gap-1.5"><Undo2 className="w-4 h-4" /> Material Returns</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle + " text-amber-600"}>Cone Return (kg)</label>
                <input type="number" step="0.01" value={coneReturnQty} onChange={(e) => setConeReturnQty(e.target.value)} className={inputStyle} placeholder="0.00" />
              </div>
              <div>
                <label className={labelStyle + " text-amber-600"}>Jarigai Return (kg)</label>
                <input type="number" step="0.01" value={jarigaiReturnQty} onChange={(e) => setJarigaiReturnQty(e.target.value)} className={inputStyle} placeholder="0.00" />
              </div>
            </div>
          </div>
        )}

        <div className="px-4">
           <input type="text" value={materialBill} onChange={(e) => setMaterialBill(e.target.value)} className={inputStyle} placeholder="Bill / Document Reference" />
        </div>

        <button type="submit" className="w-full bg-[#5833ee] text-white py-4 rounded-lg text-lg font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.99] mt-2">
          <Save className="w-5 h-5" /> Save All Entries
        </button>
      </form>
    </div>
  );
};
