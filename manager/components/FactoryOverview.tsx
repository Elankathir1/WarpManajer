
import React, { useState, useMemo } from 'react';
import { LoomConfig, LoomID, Transaction } from '../types';
import { 
  LayoutDashboard, 
  Package, 
  Dna, 
  ChevronDown, 
  Info, 
  Activity, 
  Zap, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  PieChart 
} from 'lucide-react';
import clsx from 'clsx';

interface FactoryOverviewProps {
  loomConfigs: Record<LoomID, LoomConfig>;
  transactions: Transaction[];
}

type ViewFilter = 'overall' | LoomID;

/**
 * Visual Comparison Chart Component for Required vs Available
 */
const InventoryGapChart: React.FC<{
  title: string;
  icon: any;
  required: number;
  available: number;
  unit: string;
  color: 'emerald' | 'purple';
}> = ({ title, icon: Icon, required, available, unit, color }) => {
  const diff = available - required;
  const status = diff > 0 ? 'surplus' : diff < 0 ? 'shortage' : 'equal';
  
  const statusColor = {
    surplus: 'text-emerald-500 bg-emerald-50 border-emerald-100',
    shortage: 'text-rose-500 bg-rose-50 border-rose-100',
    equal: 'text-amber-500 bg-amber-50 border-amber-100'
  }[status];

  const barColor = {
    surplus: 'bg-emerald-500',
    shortage: 'bg-rose-500',
    equal: 'bg-amber-500'
  }[status];

  const maxVal = Math.max(required, available, 1) * 1.2;
  const reqWidth = (required / maxVal) * 100;
  const availWidth = (available / maxVal) * 100;

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col group transition-all hover:shadow-md h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className={clsx("p-2 rounded-lg", color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600')}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-xs md:text-sm uppercase tracking-tight">{title}</h3>
        </div>
        <div className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 border shrink-0", statusColor)}>
          {status === 'surplus' && <TrendingUp className="w-3 h-3" />}
          {status === 'shortage' && <TrendingDown className="w-3 h-3" />}
          {status === 'equal' && <Minus className="w-3 h-3" />}
          {status}
        </div>
      </div>

      <div className="space-y-6 flex-1">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5">
              <span>Required for weavers</span>
              <span className="text-slate-700 font-bold">{required.toFixed(2)} {unit}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-300 transition-all duration-1000" style={{ width: `${reqWidth}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5">
              <span>Available in stock</span>
              <span className="text-slate-700 font-bold">{available.toFixed(2)} {unit}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-lg overflow-hidden border border-slate-50 relative">
              <div className={clsx("h-full transition-all duration-1000", barColor)} style={{ width: `${availWidth}%` }} />
              <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-white/50 z-10" style={{ left: `${reqWidth}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Inventory Analysis</span>
            <span className={clsx("text-sm font-bold", status === 'shortage' ? 'text-rose-600' : 'text-slate-800')}>
              {status === 'surplus' ? `${diff.toFixed(2)} ${unit} Surplus` : 
               status === 'shortage' ? `${Math.abs(diff).toFixed(2)} ${unit} Shortage` : 
               'Stock Matches Goal'}
            </span>
          </div>
          <Info className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </div>
  );
};

/**
 * Analytic Card for Consumption vs Stock Balance
 */
const UtilizationCard: React.FC<{
  label: string;
  consumed: number;
  balance: number;
  unit: string;
  icon: any;
  colorClass: string;
}> = ({ label, consumed, balance, unit, icon: Icon, colorClass }) => {
  const totalHandled = consumed + balance;
  const ratio = (consumed / (totalHandled || 1)) * 100;
  const isHealthy = balance >= 0;
  
  const deltaValue = balance - consumed;
  const isPositive = deltaValue >= 0;
  
  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-slate-300 relative overflow-hidden h-full">
       <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className={clsx("p-2 rounded-lg shrink-0", colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <h4 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-tight">{label} Utilization</h4>
          </div>
          <div className={clsx(
            "inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-black border shadow-sm transition-all animate-pulse self-start sm:self-auto",
            isPositive 
              ? "text-emerald-600 border-emerald-200 bg-emerald-50" 
              : "text-rose-600 border-rose-200 bg-rose-50"
          )}>
            {isPositive ? '+' : ''}{deltaValue.toFixed(2)}
            <span className="text-[9px] opacity-70 ml-1 font-bold">{unit}</span>
          </div>
       </div>
       
       <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch Consumed</div>
             <div className="text-xl md:text-2xl font-bold text-rose-500">-{consumed.toFixed(2)} <span className="text-[10px] font-bold text-rose-400">{unit}</span></div>
          </div>
          <div className="space-y-1 text-right">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</div>
             <div className={clsx("text-xl md:text-2xl font-bold", isHealthy ? "text-slate-800" : "text-rose-600")}>
                {balance.toFixed(2)} <span className="text-[10px] font-bold text-slate-400">{unit}</span>
             </div>
          </div>
       </div>

       <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase">
             <span className="text-slate-400 tracking-widest">Inventory Load</span>
             <span className="text-slate-600">{Math.round(ratio)}% Consumed</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
             <div className="h-full bg-rose-400 transition-all duration-1000 border-r border-white/20" style={{ width: `${Math.min(Math.max(0, ratio), 100)}%` }} />
             <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${Math.min(Math.max(0, 100 - ratio), 100)}%` }} />
          </div>
       </div>
    </div>
  );
};

export const FactoryOverview: React.FC<FactoryOverviewProps> = ({ loomConfigs, transactions }) => {
  const [view, setView] = useState<ViewFilter>('overall');

  const data = useMemo(() => {
    const configs = view === 'overall' ? Object.values(loomConfigs) : [loomConfigs[view]];
    
    const produced = configs.reduce((acc, c) => acc + c.current, 0);
    const target = configs.reduce((acc, c) => acc + c.target, 0);
    const remaining = Math.max(0, target - produced);
    
    const coneNeeded = configs.reduce((acc, c) => acc + (Math.max(0, c.target - c.current) * c.coneUsageFactor), 0);
    const jarigaiNeeded = configs.reduce((acc, c) => acc + (Math.max(0, c.target - c.current) * c.jarigaiUsageFactor), 0);

    const coneBalance = configs.reduce((acc, c) => acc + c.coneStock, 0);
    const jarigaiBalance = configs.reduce((acc, c) => acc + c.jarigaiStock, 0);

    let totalConeConsumed = 0;
    let totalJarigaiConsumed = 0;

    configs.forEach(config => {
      const batchTxs = transactions.filter(t => t.loomId === config.id && t.batchNumber === config.batchNumber);
      totalConeConsumed += batchTxs.filter(t => t.type === 'PRODUCTION').reduce((a, b) => a + (b.value * config.coneUsageFactor), 0);
      totalJarigaiConsumed += batchTxs.filter(t => t.type === 'PRODUCTION').reduce((a, b) => a + (b.value * config.jarigaiUsageFactor), 0);
    });

    return {
      produced, target, remaining, 
      coneBalance, jarigaiBalance, 
      coneNeeded, jarigaiNeeded,
      totalConeConsumed, totalJarigaiConsumed,
      progress: (produced / (target || 1)) * 100
    };
  }, [view, loomConfigs, transactions]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight uppercase">Factory Intelligence</h2>
          <p className="text-slate-500 font-medium text-sm md:text-[15px]">Factory-wide material flow and utilization metrics</p>
        </div>
        <div className="relative min-w-full md:min-w-[240px]">
          <select value={view} onChange={(e) => setView(e.target.value as ViewFilter)} className="w-full pl-10 pr-10 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-700 appearance-none outline-none shadow-sm cursor-pointer focus:border-indigo-500 transition-colors">
            <option value="overall">Full Factory Analytics</option>
            <option value="1">Loom 01 View</option>
            <option value="2">Loom 02 View</option>
            <option value="3">Loom 03 View</option>
            <option value="4">Loom 04 View</option>
          </select>
          <LayoutDashboard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* SECONDARY DASHBOARD: Factory Material Utilization */}
      <div className="space-y-4 md:space-y-6">
         <div className="flex items-center gap-2 px-1 md:px-2">
            <div className="p-2 bg-indigo-50 rounded-lg shrink-0"><PieChart className="w-5 h-5 text-indigo-600" /></div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 uppercase tracking-tight">Material Utilization</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <UtilizationCard 
              label="Overall Cone" 
              consumed={data.totalConeConsumed} 
              balance={data.coneBalance} 
              unit="kg" 
              icon={Package} 
              colorClass="bg-orange-50 text-orange-600" 
            />
            <UtilizationCard 
              label="Overall Jarigai" 
              consumed={data.totalJarigaiConsumed} 
              balance={data.jarigaiBalance} 
              unit="kg" 
              icon={Dna} 
              colorClass="bg-purple-50 text-purple-600" 
            />
         </div>
      </div>

      {/* Inventory Gap Analysis */}
      <div className="space-y-4 md:space-y-6">
         <div className="flex items-center gap-2 px-1 md:px-2">
            <div className="p-2 bg-indigo-50 rounded-lg shrink-0"><Activity className="w-5 h-5 text-indigo-600" /></div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 uppercase tracking-tight">Gap Analysis</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <InventoryGapChart title="Cone Availability Gap" icon={Package} required={data.coneNeeded} available={data.coneBalance} unit="kg" color="emerald" />
            <InventoryGapChart title="Jarigai Availability Gap" icon={Dna} required={data.jarigaiNeeded} available={data.jarigaiBalance} unit="kg" color="purple" />
         </div>
      </div>

      {/* Unit Production Health Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-5 md:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/30">
            <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
               <Activity className="w-5 h-5 text-indigo-600" /> Unit Production Health
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border px-3 py-1.5 rounded-full shadow-sm"><Zap className="w-3.5 h-3.5 text-amber-500" /> Real-time</div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px] min-w-[700px]">
               <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                  <tr>
                     <th className="px-6 py-4">Loom Unit</th>
                     <th className="px-6 py-4">Batch Progress</th>
                     <th className="px-6 py-4">Left (pcs)</th>
                     <th className="px-6 py-4">Cone Deficit</th>
                     <th className="px-6 py-4">Jarigai Deficit</th>
                     <th className="px-6 py-4 text-center">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {(['1', '2', '3', '4'] as LoomID[]).map(id => {
                     const c = loomConfigs[id];
                     const rem = Math.max(0, c.target - c.current);
                     const cReq = rem * c.coneUsageFactor;
                     const jReq = rem * c.jarigaiUsageFactor;
                     const cShort = Math.max(0, cReq - c.coneStock);
                     const jShort = Math.max(0, jReq - c.jarigaiStock);
                     const isSafe = cShort === 0 && jShort === 0;
                     const progress = (c.current / (c.target || 1)) * 100;

                     return (
                        <tr key={id} className="hover:bg-slate-50/30 transition-all group">
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-sm shrink-0">{id}</div>
                                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">BATCH #{c.batchNumber}</div>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-3 min-w-[100px]">
                                 <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 group-hover:bg-indigo-600 transition-colors" style={{ width: `${progress}%` }} />
                                 </div>
                                 <span className="font-bold text-slate-700">{Math.round(progress)}%</span>
                              </div>
                           </td>
                           <td className="px-6 py-5 font-bold text-slate-800">{rem}</td>
                           <td className="px-6 py-5 font-bold text-rose-500">{cShort > 0 ? cShort.toFixed(2) : 'OK'}</td>
                           <td className="px-6 py-5 font-bold text-rose-500">{jShort > 0 ? jShort.toFixed(2) : 'OK'}</td>
                           <td className="px-6 py-5 text-center">
                              <span className={clsx("px-3 py-1 rounded-md text-[10px] font-bold uppercase border whitespace-nowrap", isSafe ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse")}>
                                 {isSafe ? "Operating" : "Refill Req"}
                              </span>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
