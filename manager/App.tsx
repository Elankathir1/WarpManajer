
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LoomDashboard } from './components/LoomDashboard';
import { TransactionForm } from './components/TransactionForm';
import { DataManagement } from './components/DataManagement';
import { FactoryOverview } from './components/FactoryOverview';
import { Help } from './components/Help';
import Logo from './components/Logo';
import { storageService } from './services/storageService';
import { LoomID, LoomConfig, Transaction } from './types';
import { LayoutDashboard, Factory, PlusSquare, Menu, X, DownloadCloud, Settings, CloudLightning, Loader2, CircleHelp, BarChart3, Database, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loomConfigs, setLoomConfigs] = useState<Record<LoomID, LoomConfig>>(storageService.getLoomConfigs());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    storageService.initializeCloud();
    const unsubscribe = storageService.subscribe(() => {
      refreshData();
    });

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Initial refresh
    refreshData();

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const refreshData = () => {
    setTransactions(storageService.getTransactions());
    setLoomConfigs(storageService.getLoomConfigs());
    setIsLoading(storageService.getLoadingStatus());
    setIsConnected(storageService.getConnectionStatus());
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Logo size="lg" className="mb-8 animate-pulse" />
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800 text-center uppercase tracking-tight">Syncing with Warp Cloud...</h2>
        <p className="text-slate-500 text-sm mt-2 text-center max-w-xs">Establishing secure connection to Firebase Realtime Database</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen flex bg-slate-50">
        
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={clsx(
          "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-200 p-4 transform transition-transform duration-200 lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between mb-8 px-2 mt-4">
            <div className="flex flex-col">
              <Logo size="sm" />
              <h1 className="text-xl font-black text-white mt-1 tracking-tighter">
                WarpManager
              </h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto sidebar-scroll pr-2">
            <SidebarLink to="/entry" icon={PlusSquare} label="Data Entry" />
            
            <div className="pt-4 pb-2 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Loom Dashboards
            </div>
            {(['1', '2', '3', '4'] as LoomID[]).map(id => (
              <SidebarLink key={id} to={`/loom/${id}`} icon={LayoutDashboard} label={`Loom ${id}`} />
            ))}
            
            <div className="mt-2 pt-2 border-t border-slate-800">
               <SidebarLink to="/overview" icon={BarChart3} label="Dashboard Overview" />
            </div>

            <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Resources
            </div>
            <SidebarLink to="/settings" icon={Settings} label="Settings" />
            <SidebarLink to="/help" icon={CircleHelp} label="User Guide" />
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className={clsx(
                "mb-2 px-4 py-2 rounded border flex items-center gap-2 text-[10px] transition-colors",
                isConnected 
                  ? "bg-emerald-900/40 border-emerald-700/50 text-emerald-300" 
                  : "bg-rose-900/40 border-rose-700/50 text-rose-300"
            )}>
                {isConnected ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-rose-400 animate-pulse" />}
                <span>{isConnected ? 'Firebase Real-time Active' : 'Offline / Reconnecting'}</span>
            </div>
            
            <div className="mb-4 px-4 py-2 bg-indigo-900/40 rounded border border-indigo-700/50 flex items-center gap-2 text-[11px] text-indigo-300">
                <CloudLightning className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span>Encrypted Sync Shield</span>
            </div>

            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="w-full mb-4 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
              >
                <DownloadCloud className="w-4 h-4" />
                Install PWA
              </button>
            )}
            
            <div className="text-center px-4">
              <div className="text-[11px] text-slate-600 mb-1 font-mono">CLOUD BUILD v2.0</div>
              <div className="text-[11px] text-slate-500 font-medium opacity-50">
                ID: <span className="text-indigo-400">{storageService.getProjectId()}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
          <header className="bg-white border-b border-slate-200 p-4 flex items-center gap-4 lg:hidden sticky top-0 z-10 shadow-sm">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="font-black text-slate-900 tracking-tighter text-sm">WarpManager</span>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-10">
            <div className="max-w-6xl mx-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/entry" replace />} />
                
                <Route path="/overview" element={
                  <FactoryOverview loomConfigs={loomConfigs} transactions={transactions} />
                } />

                <Route path="/entry" element={
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Daily Operations</h2>
                      <p className="text-slate-500">Log production sarees and inventory receipts.</p>
                    </div>
                    <TransactionForm onSuccess={refreshData} />
                  </div>
                } />

                <Route path="/settings" element={
                  <DataManagement onUpdate={refreshData} />
                } />

                <Route path="/help" element={
                  <Help />
                } />

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
