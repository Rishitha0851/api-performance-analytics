import React from 'react';
import {
  LayoutDashboard,
  DatabaseZap,
  BarChart3,
  LineChart,
  FileText,
  Layers,
  Cpu,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type PageId = 'overview' | 'module1' | 'module2' | 'visualizations' | 'reports';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage, isOpen }) => {
  const navItems = [
    {
      id: 'overview' as PageId,
      name: 'Overview Dashboard',
      subtitle: 'System Telemetry & Activity',
      icon: LayoutDashboard,
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'module1' as PageId,
      name: 'Module 1 – Collection & Prep',
      subtitle: 'HTTP Tracing, Load Test, Cleaning',
      icon: DatabaseZap,
      badge: 'Academic',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'module2' as PageId,
      name: 'Module 2 – Stats & Bottlenecks',
      subtitle: 'Descriptive, Correlation, Anomalies',
      icon: BarChart3,
      badge: 'Academic',
      badgeColor: 'bg-violet-100 text-violet-700',
    },
    {
      id: 'visualizations' as PageId,
      name: 'Performance Visualization',
      subtitle: 'Recharts Interactive Analytics',
      icon: LineChart,
      badge: '8 Charts',
      badgeColor: 'bg-cyan-100 text-cyan-700',
    },
    {
      id: 'reports' as PageId,
      name: 'Reports & Downloads',
      subtitle: 'PDF Generation & CSV Exports',
      icon: FileText,
      badge: 'Export',
      badgeColor: 'bg-amber-100 text-amber-700',
    },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200/80 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col justify-between ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                API Analytics
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-600 rounded font-bold border border-blue-200">
                  v2.0
                </span>
              </h2>
              <p className="text-[11px] font-medium text-slate-400">Enterprise Academic Suite</p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="p-3 space-y-1.5">
          <p className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Analytics Modules
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-150 flex items-center justify-between group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="truncate">
                    <p
                      className={`text-xs font-semibold tracking-tight truncate ${
                        isActive ? 'text-blue-900' : 'text-slate-700 group-hover:text-slate-900'
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-300 transition-transform ${
                      isActive ? 'text-blue-500 translate-x-0.5' : 'group-hover:translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Academic Specs Card */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 m-3 rounded-xl border">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-slate-800">Academic Architecture</h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
          Zero simulated frontend math. All statistics, IQR bounds, and Pearson/Spearman matrices compute natively in Python backend.
        </p>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-200/60">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-500" /> FastAPI + SQLite
          </span>
          <span className="text-emerald-600 font-semibold">100% Operational</span>
        </div>
      </div>
    </aside>
  );
};
