import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Tag,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { fetchActivityLogs, exportToCsv } from '@/lib/dataService';
import { ActivityLog } from '@/types';

const ENTITY_TYPES = [
  { value: 'all', label: 'All Entities' },
  { value: 'order', label: 'Orders' },
  { value: 'product', label: 'Products' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'delivery', label: 'Deliveries' },
  { value: 'stock', label: 'Inventory Stock' },
  { value: 'expense', label: 'Expenses' },
  { value: 'user', label: 'Users & Staff' },
  { value: 'settings', label: 'Settings' },
];

export const ActivityLogsPage: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [searchAction, setSearchAction] = useState<string>('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchActivityLogs(selectedEntity, searchAction || undefined, 100);
      setLogs(data);
    } catch (err) {
      console.error(err);
      notifyError('Failed to fetch activity logs', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedEntity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Description', 'Performed By'];
    const rows = logs.map((l) => [
      new Date(Number(l.createdAt)).toISOString(),
      l.action,
      l.entityType,
      l.entityId || '',
      l.description,
      l.performedByName,
    ]);
    exportToCsv('danix-activity-audit-log', headers, rows);
    notifySuccess('Audit logs exported to CSV!');
  };

  const getBadgeColor = (entity: string) => {
    switch (entity) {
      case 'order':
        return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'product':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'stock':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'delivery':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'expense':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'user':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'settings':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              Compliance & Security
            </span>
          </div>
          <h1 className="text-2xl font-bold text-navy-950 sm:text-3xl">
            System Activity Audit Trail
          </h1>
          <p className="text-xs text-slate-500">
            Immutable log of system modifications, stock movements, invoice generation, and admin actions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          {/* Entity Type Dropdown */}
          <div className="w-full sm:w-64">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Filter by Entity
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {ENTITY_TYPES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action text search */}
          <div className="w-full flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Search Action / Description
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search action e.g. Created, Stock, Invoice..."
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto self-end">
            <button
              type="submit"
              className="w-full sm:w-auto rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition-colors"
            >
              Filter Logs
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Entity Type</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Entity ID</th>
                <th className="px-6 py-3">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No activity records found matching filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateObj = new Date(Number(log.createdAt));
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        <div className="font-medium text-slate-800">
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                        {log.action}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(
                            log.entityType
                          )}`}
                        >
                          {log.entityType}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-800 max-w-md">
                        <p className="line-clamp-2">{log.description}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {log.entityId || '—'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-navy-800 text-[10px] font-bold text-white">
                            {log.performedByName.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-700">{log.performedByName}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
