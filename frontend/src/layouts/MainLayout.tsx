import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Sidebar, PageId } from '../components/Sidebar';
import { Menu, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastInfo {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface MainLayoutProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  backendConnected: boolean;
  onRefresh: () => void;
  onSeedData: () => void;
  onClearData: () => void;
  isSeeding?: boolean;
  isRefreshing?: boolean;
  totalRecords?: number;
  toast?: ToastInfo | null;
  onDismissToast?: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentPage,
  onSelectPage,
  backendConnected,
  onRefresh,
  onSeedData,
  onClearData,
  isSeeding,
  isRefreshing,
  totalRecords,
  toast,
  onDismissToast,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <Header
        backendConnected={backendConnected}
        onRefresh={onRefresh}
        onSeedData={onSeedData}
        onClearData={onClearData}
        isSeeding={isSeeding}
        isRefreshing={isRefreshing}
        totalRecords={totalRecords}
      />

      {/* Floating Success / Error Notification Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold max-w-md ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-emerald-500/10'
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-rose-500/10'
                : 'bg-blue-50 text-blue-800 border-blue-300 shadow-blue-500/10'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{toast.message}</span>
            {onDismissToast && (
              <button onClick={onDismissToast} className="ml-2 text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile toggle button */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-2 text-sm font-semibold"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span>Module Navigation</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <Sidebar
          currentPage={currentPage}
          onSelectPage={(page) => {
            onSelectPage(page);
            setMobileSidebarOpen(false);
          }}
          isOpen={mobileSidebarOpen}
          onToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
