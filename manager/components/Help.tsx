
import React from 'react';
import { BookOpen, RefreshCcw, CheckCircle, AlertTriangle, Download } from 'lucide-react';

export const Help: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-8 border-b pb-6 border-slate-100">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">How to use WarpManager</h1>
            <p className="text-slate-500">Guide to daily operations and features.</p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          
          <section className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-xs">1</span>
              Daily Data Entry
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-600 space-y-2">
              <p>Go to the <strong>Data Entry</strong> page for all updates.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Select the <strong>Loom Number</strong>.</li>
                <li><strong>Production:</strong> Enter Saree count (Output).</li>
                <li><strong>Materials:</strong> Enter Cone/Jarigai weight (Input).</li>
                <li>Click <strong>Save</strong>.</li>
              </ul>
              <p className="italic text-slate-400 mt-2">The system automatically calculates material usage based on the preset factors.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-xs">2</span>
              Stock Monitoring
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-600 space-y-3">
               <p>Check the <strong>Loom Dashboard</strong> for real-time stock status.</p>
               <div className="grid grid-cols-2 gap-2">
                 <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 font-bold text-center">
                   Green Dot
                   <div className="text-[10px] font-normal text-emerald-600">Healthy Stock</div>
                 </div>
                 <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 font-bold text-center">
                   Red Pulsing
                   <div className="text-[10px] font-normal text-red-600">Critical Stock</div>
                 </div>
               </div>
            </div>
          </section>

          <section className="space-y-4 md:col-span-2">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-xs">3</span>
              Automated Inventory Logic
            </h3>
            <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100 flex flex-col md:flex-row gap-4 items-start">
              <RefreshCcw className="w-8 h-8 text-indigo-600 shrink-0 mt-1" />
              <div className="space-y-2 text-sm text-slate-700">
                <p className="font-semibold text-indigo-900">How stock is calculated?</p>
                <p>
                  Every time production is entered, the app subtracts the required weight from your current Cone and Jarigai inventory.
                </p>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Inventory receipts add to stock directly.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Stock goes negative if usage exceeds logged receipts.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 md:col-span-2">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-xs">4</span>
              Troubleshooting
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
               <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Data Not Syncing?
                  </h4>
                  <p className="text-sm text-amber-700">
                    Go to <strong>Settings</strong> and click "Sync Now". This reloads the latest data.
                  </p>
               </div>
               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4" /> Need Backups?
                  </h4>
                  <p className="text-sm text-blue-700">
                    Download a full JSON backup from Settings for your records.
                  </p>
               </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
