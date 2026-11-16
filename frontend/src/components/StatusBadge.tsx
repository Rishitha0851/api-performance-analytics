import React from 'react';

interface StatusBadgeProps {
  type?: 'status' | 'severity' | 'workload' | 'simulated';
  value: string | number;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type = 'status', value, className = '' }) => {
  if (type === 'status') {
    const code = Number(value);
    let bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (code >= 400 && code < 500) {
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (code >= 500 || code === 0) {
      bg = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (code >= 300) {
      bg = 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg} ${className}`}>
        {value === 0 ? 'ERR' : `${value} ${code === 200 ? 'OK' : ''}`}
      </span>
    );
  }

  if (type === 'severity') {
    const sev = String(value).toLowerCase();
    let bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (sev === 'critical') {
      bg = 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse';
    } else if (sev === 'high') {
      bg = 'bg-orange-100 text-orange-800 border-orange-300 font-semibold';
    } else if (sev === 'medium') {
      bg = 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (sev === 'low') {
      bg = 'bg-sky-50 text-sky-700 border-sky-200';
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs uppercase tracking-wider font-semibold border ${bg} ${className}`}>
        {value}
      </span>
    );
  }

  if (type === 'workload') {
    const w = String(value).toLowerCase();
    let bg = 'bg-slate-100 text-slate-700 border-slate-200';
    if (w.includes('normal')) bg = 'bg-blue-50 text-blue-700 border-blue-200';
    else if (w.includes('moderate')) bg = 'bg-cyan-50 text-cyan-700 border-cyan-200';
    else if (w.includes('high')) bg = 'bg-violet-50 text-violet-700 border-violet-200';
    else if (w.includes('heavy')) bg = 'bg-rose-50 text-rose-700 border-rose-200';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${bg} ${className}`}>
        {value}
      </span>
    );
  }

  if (type === 'simulated') {
    const isSim = Boolean(value);
    return isSim ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
        Simulated
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Live Trace
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
      {value}
    </span>
  );
};
