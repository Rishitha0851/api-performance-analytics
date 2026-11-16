import React from 'react';
import { Activity, RefreshCw, Database, Sparkles, Trash2 } from 'lucide-react';

interface HeaderProps {
  backendConnected: boolean;
  onRefresh: () => void;
  onSeedData: () => void;
  onClearData: () => void;
  isSeeding?: boolean;
  isRefreshing?: boolean;
  totalRecords?: number;
}

export const Header: React.FC<HeaderProps> = ({
  backendConnected,
  onRefresh,
  onSeedData,
  onClearData,
  isSeeding = false,
  isRefreshing = false,
  totalRecords = 0,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      {/* Academic research top stripe */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
      
      <div className="px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Project Title and Academic Subtitle */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                API Performance Analytics
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                Academic Research
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Statistical Analysis of Response Time, Request Frequency & Server Load for Identifying Bottlenecks
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Backend Health Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              backendConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            {backendConnected ? 'FastAPI Connected' : 'Backend Disconnected'}
          </div>

          {/* Records Counter */}
          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>{totalRecords} Records</span>
          </div>

          {/* Quick Seed Button */}
          <button
            onClick={onSeedData}
            disabled={isSeeding || !backendConnected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow transition-all disabled:opacity-50"
            title="Load 600 multi-stage sample records"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Seeding...' : 'Seed Sample Data (600)'}
          </button>

          {/* Refresh Data Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
            title="Refresh current dataset"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Clear DB Button */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all records from SQLite?')) {
                onClearData();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            title="Clear SQLite database"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
