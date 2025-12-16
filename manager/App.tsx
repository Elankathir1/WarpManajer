import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LoomDashboard } from './components/LoomDashboard';
import { TransactionForm } from './components/TransactionForm';
import { DataManagement } from './components/DataManagement';
import { storageService } from './services/storageService';
import { LoomID, LoomConfig, Transaction } from './types';
import { LayoutDashboard, Factory, PlusSquare, Menu, X, DownloadCloud, Settings, CloudLightning, Loader2 } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loomConfigs, setLoomConfigs] = useState<Record<LoomID, LoomConfig>>(storageService.getLoomConfigs());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount and listen for install prompt
  useEffect(() => {
    // 1. Initialize Cloud Connection IMMEDIATELY
    storageService.initializeCloud();

    // 2. Initial Data Load check
    refreshData();

    // 3. Subscribe to changes (Real-time updates)
    const unsubscribe = storageService.subscribe(() => {
        refreshData();
    });

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const refreshData = () => {
    setTransactions(storageService.getTransactions());
    setLoomConfigs(storageService.getLoomConfigs());
    // Only stop loading if the service says data is ready
    setIsLoading(storageService.getLoadingStatus());
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const SidebarLink = ({ to, icon: Icon, label }: any) => (
    <NavLink
      to={to}
      onClick={() => setIsMobileMenuOpen(false)}
      className={({ isActive }) => clsx(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
        isActive 
          ? "bg-indigo-600 text-white shadow-md font-medium" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );

  // --- LOADING SCREEN ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Syncing Data...</h2>
        <p className="text-slate-500 text-sm mt-2">Connecting to Cloud Database</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen flex bg-slate-100">
        
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={clsx(
          "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-200 p-4 transform transition-transform duration-200 lg:translate-x-0 flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between mb-8 px-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Factory className="text-indigo-500" />
              WarpManager
            </h1>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-2 flex-1">
            <SidebarLink to="/entry" icon={PlusSquare} label="Data Entry" />
            
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dashboards
            </div>
            <SidebarLink to="/loom/1" icon={LayoutDashboard} label="Loom 1" />
            <SidebarLink to="/loom/2" icon={LayoutDashboard} label="Loom 2" />
            <SidebarLink to="/loom/3" icon={LayoutDashboard} label="Loom 3" />
            <SidebarLink to="/loom/4" icon={LayoutDashboard} label="Loom 4" />

            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              System
            </div>
            <SidebarLink to="/settings" icon={Settings} label="Settings" />
          </div>

          {/* Sync Status */}
          <div className="mb-4 px-4 py-2 bg-indigo-900/50 rounded border border-indigo-700 flex items-center gap-2 text-xs text-indigo-300">
              <CloudLightning className="w-4 h-4 text-green-400 animate-pulse" />
              <span>Sync Active</span>
          </div>

          {/* Install Button (Only shows if installable) */}
          {deferredPrompt && (
            <div className="mb-4">
              <button 
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <DownloadCloud className="w-4 h-4" />
                Install App
              </button>
            </div>
          )}
          
          <div className="text-center mt-auto">
            <div className="text-xs text-slate-600 mb-1">v1.5.0 (Cloud)</div>
            <div className="text-[10px] text-slate-500 font-medium opacity-70">
              Project: <span className="text-indigo-400">{storageService.getProjectId()}</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 p-4 flex items-center gap-4 lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <span className="font-bold text-slate-800">Powerloom Dashboard</span>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/entry" replace />} />
                
                <Route path="/entry" element={
                  <div className="space-y-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-800">Daily Data Entry</h2>
                      <p className="text-slate-500">Log material receipts and production counts here.</p>
                    </div>
                    <TransactionForm onSuccess={refreshData} />
                  </div>
                } />

                <Route path="/settings" element={
                  <DataManagement onUpdate={refreshData} />
                } />

                {/* Dynamic Route for Looms */}
                {['1', '2', '3', '4'].map((id) => (
                  <Route 
                    key={id}
                    path={`/loom/${id}`} 
                    element={
                      <LoomDashboard 
                        loomId={id as LoomID}
                        transactions={transactions}
                        config={loomConfigs[id as LoomID]}
                        onUpdate={refreshData}
                      />
                    } 
                  />
                ))}
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}

export default App;