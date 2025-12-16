import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoomID, Transaction } from '../types';
import { PlusCircle, Save, Scissors, Package, AlertCircle, Loader2 } from 'lucide-react';
import { storageService } from '../services/storageService';

interface Props {
  onSuccess: () => void;
}

export const TransactionForm: React.FC<Props> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [sareeError, setSareeError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const cleanNum = (num: number) => Math.round((num + Number.EPSILON) * 1000) / 1000;
  const getLocalDate = () => new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: getLocalDate(),
    loomId: '1' as LoomID,
    sareeQty: '',
    sareeBillNo: '',
    coneQty: '',
    jarigaiQty: '',
    materialBillNo: ''
  });

  const handleSareeChange = (val: string) => {
    setFormData({ ...formData, sareeQty: val });
    if (val && !Number.isInteger(Number(val))) setSareeError(true);
    else setSareeError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    // VALIDATION
    if (formData.sareeQty && !Number.isInteger(Number(formData.sareeQty))) {
        alert("❌ Invalid Saree Quantity. Whole numbers only.");
        setIsSaving(false);
        return;
    }

    const configs = storageService.getLoomConfigs();
    const config = configs[formData.loomId];
    const activeBatchId = config.currentBatchId;
    const timestamp = Date.now();

    // 1. Calculate Batch Status
    const allTxs = storageService.getTransactions();
    const currentBatchTotal = cleanNum(allTxs.filter(t => {
        if (String(t.loomId) !== String(formData.loomId)) return false;
        if (t.isArchived) return false;
        
        // Match strict batch ID or legacy
        if (activeBatchId && t.batchId === activeBatchId) return true;
        if (activeBatchId?.includes('legacy') && !t.batchId) return true;
        
        return false;
    }).filter(t => t.item === 'SAREE').reduce((sum, t) => sum + t.quantity, 0));

    const remainingSpace = Math.max(0, cleanNum(config.targetQty - currentBatchTotal));
    const inputSarees = formData.sareeQty ? parseFloat(formData.sareeQty) : 0;
    
    // --- SPLIT LOGIC (Atomic) ---
    if (inputSarees > remainingSpace) {
        const excess = cleanNum(inputSarees - remainingSpace);
        const confirmMsg = remainingSpace === 0 
            ? `⚠️ BATCH FULL (${currentBatchTotal}/${config.targetQty})\n\nNew input (${inputSarees} sarees) will start the NEXT BATCH.\n\nCarry forward stocks automatically?`
            : `⚠️ TARGET EXCEEDED\n\nBatch will close with ${remainingSpace} more sarees.\n${excess} sarees will go to NEW BATCH.\n\nProceed?`;

        if (confirm(confirmMsg)) {
            // Prepare Fillers (To be added to Old Batch)
            const fillers: Transaction[] = [];
            
            // Materials always go to old batch first (consumed)
            if (formData.coneQty) {
                fillers.push({
                    id: crypto.randomUUID(), date: formData.date, billNo: formData.materialBillNo,
                    loomId: formData.loomId, type: 'MATERIAL_IN', item: 'CONE',
                    quantity: parseFloat(formData.coneQty), timestamp, batchId: activeBatchId
                });
            }
            if (formData.jarigaiQty) {
                fillers.push({
                    id: crypto.randomUUID(), date: formData.date, billNo: formData.materialBillNo,
                    loomId: formData.loomId, type: 'MATERIAL_IN', item: 'JARIGAI',
                    quantity: parseFloat(formData.jarigaiQty), timestamp: timestamp + 1, batchId: activeBatchId
                });
            }
            // Filler Saree
            if (remainingSpace > 0) {
                fillers.push({
                    id: crypto.randomUUID(), date: formData.date, billNo: formData.sareeBillNo,
                    loomId: formData.loomId, type: 'SAREE_OUT', item: 'SAREE',
                    quantity: remainingSpace, timestamp: timestamp + 2, batchId: activeBatchId
                });
            }

            // Prepare Excess (New Batch)
            // Note: batchId is NOT set here, the Service will assign the NEW Batch ID
            const excessItems: Transaction[] = [];
            if (excess > 0) {
                excessItems.push({
                    id: crypto.randomUUID(), date: formData.date, billNo: formData.sareeBillNo,
                    loomId: formData.loomId, type: 'SAREE_OUT', item: 'SAREE',
                    quantity: excess, timestamp: timestamp + 20
                } as Transaction);
            }

            // EXECUTE ATOMIC SPLIT
            try {
                await storageService.performBatchSplit(formData.loomId, fillers, excessItems);
                alert("✅ Batch Split Complete!\n\nArchive & New Batch started successfully.");
                setFormData({ ...formData, sareeQty: '', coneQty: '', jarigaiQty: '', sareeBillNo: '', materialBillNo: '' });
                onSuccess();
                navigate(`/loom/${formData.loomId}`);
            } catch (err) {
                alert("Failed to split batch. Check connection.");
                console.error(err);
            } finally {
                setIsSaving(false);
            }
            return;
        }
    }

    // --- NORMAL ENTRY (No Split) ---
    const txs: Transaction[] = [];
    if (formData.sareeQty) txs.push({
        id: crypto.randomUUID(), date: formData.date, billNo: formData.sareeBillNo,
        loomId: formData.loomId, type: 'SAREE_OUT', item: 'SAREE',
        quantity: parseFloat(formData.sareeQty), timestamp, batchId: activeBatchId
    });
    if (formData.coneQty) txs.push({
        id: crypto.randomUUID(), date: formData.date, billNo: formData.materialBillNo,
        loomId: formData.loomId, type: 'MATERIAL_IN', item: 'CONE',
        quantity: parseFloat(formData.coneQty), timestamp: timestamp + 1, batchId: activeBatchId
    });
    if (formData.jarigaiQty) txs.push({
        id: crypto.randomUUID(), date: formData.date, billNo: formData.materialBillNo,
        loomId: formData.loomId, type: 'MATERIAL_IN', item: 'JARIGAI',
        quantity: parseFloat(formData.jarigaiQty), timestamp: timestamp + 2, batchId: activeBatchId
    });

    if (txs.length === 0) {
        alert("Enter a quantity.");
        setIsSaving(false);
        return;
    }

    try {
        await storageService.addTransactionsBatch(txs);

        // Check if exactly finished
        const newTotal = cleanNum(currentBatchTotal + (inputSarees || 0));
        if (newTotal >= config.targetQty) {
             if (confirm("✅ Batch Target Reached!\n\nDo you want to CLOSE this batch and start a fresh one now?")) {
                 await storageService.performBatchSplit(formData.loomId, [], []);
                 alert("✅ Batch Closed. New Batch Started.");
                 onSuccess();
                 navigate(`/loom/${formData.loomId}`);
                 return;
             }
        }
    } catch(e) {
        console.error(e);
    }

    setFormData(prev => ({ ...prev, sareeQty: '', coneQty: '', jarigaiQty: '', sareeBillNo: '', materialBillNo: '' }));
    setIsSaving(false);
    onSuccess();
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <PlusCircle className="w-6 h-6 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-800">New Transaction</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Common Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Date</label>
            <input type="date" required className="w-full p-2 border rounded-lg outline-none" 
                   value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Loom No</label>
            <select className="w-full p-2 border rounded-lg outline-none" 
                    value={formData.loomId} onChange={e => setFormData({ ...formData, loomId: e.target.value as LoomID })}>
              {[1, 2, 3, 4].map(n => <option key={n} value={String(n)}>Loom {n}</option>)}
            </select>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Saree Production */}
        <div className={`p-4 rounded-xl border transition-all ${sareeError ? 'bg-red-50 border-red-300' : 'bg-indigo-50/50 border-indigo-100'}`}>
            <div className="flex justify-between text-indigo-800 mb-2">
                <div className="flex items-center gap-2"><Scissors className="w-5 h-5" /><h3 className="font-bold">Production (OUT)</h3></div>
                {sareeError && <div className="text-red-600 text-xs font-bold animate-pulse">WHOLE NUMBERS ONLY</div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="number" step="1" placeholder="0" className="w-full p-3 border rounded-lg text-lg font-bold" 
                       value={formData.sareeQty} onChange={e => handleSareeChange(e.target.value)} />
                <input type="text" placeholder="Bill No" className="w-full p-3 border rounded-lg text-sm" 
                       value={formData.sareeBillNo} onChange={e => setFormData({ ...formData, sareeBillNo: e.target.value })} />
            </div>
        </div>

        {/* Materials */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-700"><Package className="w-5 h-5" /><h3 className="font-bold">Materials (IN)</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-600">Cone (kg)</label>
                    <input type="number" step="0.01" className="w-full p-3 border border-emerald-200 rounded-lg text-lg font-bold text-emerald-900" 
                           value={formData.coneQty} onChange={e => setFormData({ ...formData, coneQty: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-amber-600">Jarigai (kg)</label>
                    <input type="number" step="0.01" className="w-full p-3 border border-amber-200 rounded-lg text-lg font-bold text-amber-900" 
                           value={formData.jarigaiQty} onChange={e => setFormData({ ...formData, jarigaiQty: e.target.value })} />
                </div>
                 <div className="md:col-span-2">
                    <input type="text" placeholder="Material Bill No" className="w-full p-3 border rounded-lg text-sm" 
                           value={formData.materialBillNo} onChange={e => setFormData({ ...formData, materialBillNo: e.target.value })} />
                </div>
            </div>
        </div>

        <button type="submit" disabled={sareeError || isSaving} className={`w-full flex justify-center gap-2 py-4 rounded-xl font-bold text-lg text-white ${sareeError || isSaving ? 'bg-slate-400' : 'bg-purple-900'}`}>
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          {isSaving ? 'Saving...' : 'Save All Entries'}
        </button>
      </form>
    </div>
  );
};