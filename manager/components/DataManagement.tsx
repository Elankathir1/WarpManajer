import React, { useRef } from 'react';
import { storageService } from '../services/storageService';
import { Download, Database, RefreshCcw, Cloud, Check } from 'lucide-react';

interface Props {
  onUpdate: () => void;
}

export const DataManagement: React.FC<Props> = ({ onUpdate }) => {
  
  const handleDownloadBackup = () => {
    const dataStr = storageService.exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `warp_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearCache = async () => {
    if (confirm("⚠️ REFRESH APP\n\nThis will reload the latest version from the server. Use this if the app is stuck.\n\nYour data is safe in the Cloud.\n\nProceed?")) {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800">Data Management</h2>
        </div>

        {/* STATUS BANNER */}
        <div className="mb-8 border rounded-xl p-5 bg-indigo-50 border-indigo-200">
            <div className="flex items-center gap-2 mb-3">
                <Cloud className="w-6 h-6 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-lg">Cloud Database Connected</h3>
                <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded font-bold">LIVE</span>
            </div>
            
            <p className="text-sm text-slate-600">
                Your data is automatically saved to <strong>Firebase Firestore</strong>.
                <br />
                Everything you enter here will instantly appear on your mobile and laptop.
            </p>
        </div>

        {/* BACKUP SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-lg p-5 bg-slate-50 hover:bg-slate-100 transition-colors">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Download Report
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Save a copy of your current data as a JSON file for your records.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2 px-4 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
            >
              Download JSON
            </button>
          </div>
        </div>

         {/* Cache Reset */}
         <div className="mt-8 pt-6 border-t border-slate-200">
           <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
             <RefreshCcw className="w-4 h-4 text-slate-500" />
             Troubleshooting
           </h3>
           <div className="flex items-center justify-between gap-4 bg-red-50 p-4 rounded-lg border border-red-100">
             <div className="text-sm text-red-800">
               If data isn't showing up, try refreshing the app.
             </div>
             <button 
               onClick={handleClearCache}
               className="whitespace-nowrap px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50"
             >
               Refresh App
             </button>
           </div>
         </div>
      </div>
    </div>
  );
};