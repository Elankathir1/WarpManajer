
import React, { useRef } from 'react';
import { storageService } from '../services/storageService';
import { Download, RefreshCcw, Trash2, ShieldAlert, UploadCloud, FileJson } from 'lucide-react';

export const DataManagement: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    // Fixed: Marked the onload callback as async to allow awaiting storageService.importData
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      // Fixed: Await the asynchronous importData method
      const result = await storageService.importData(content);
      if (result.success) {
        alert("Success! Factory data has been restored.");
        onUpdate();
      } else {
        alert("Error: " + result.message);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
        <p className="text-slate-500">Manage data backups and factory configurations.</p>
      </div>

      <div className="grid gap-6">
        {/* Export Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" /> Export & Backup
            </h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">Download a JSON file containing all transactions and loom states for external bookkeeping or safe storage.</p>
          <button 
            onClick={() => storageService.exportData()}
            className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download JSON Backup
          </button>
        </section>

        {/* Import Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-600" /> Import & Restore
            </h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">Restore your data from a previous backup file. <strong>Warning:</strong> This will overwrite all your current local data.</p>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
          
          <button 
            onClick={handleImportClick}
            className="w-full sm:w-auto bg-emerald-50 text-emerald-700 border border-emerald-200 px-8 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
          >
            <FileJson className="w-4 h-4" />
            Choose Backup File
          </button>
        </section>

        {/* Sync Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-slate-400" /> Force UI Refresh
          </h3>
          <p className="text-sm text-slate-500 mb-4">Resynchronize the interface with the local database. Use this if the screen seems frozen or inconsistent.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Refresh Now
          </button>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100">
          <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Danger Zone
          </h3>
          <p className="text-sm text-red-700 mb-6">Wipe all local data and reset factory defaults. This action cannot be undone and will delete your entire history.</p>
          <button 
            onClick={() => {
              if (confirm('Are you absolutely sure? This will delete all history forever.')) {
                storageService.resetAll();
                onUpdate();
              }
            }}
            className="w-full sm:w-auto bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Reset Factory Data
          </button>
        </section>
      </div>
    </div>
  );
};
