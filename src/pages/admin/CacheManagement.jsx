import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Database, Trash2, RefreshCw, RotateCcw, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// Rough in-memory size estimate for a cached query's data — good enough for a
// "how much is this holding onto" indicator, not a precise byte count.
function estimateSize(data) {
  try {
    return new Blob([JSON.stringify(data ?? null)]).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(ts) {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CacheManagement() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [tick, setTick] = useState(0); // bumped to force a re-read of the query cache

  // Stay in sync with the live query cache (queries fetching, updating, being
  // added/removed elsewhere in the app) without polling.
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const unsubscribe = cache.subscribe(() => setTick(t => t + 1));
    return unsubscribe;
  }, [queryClient]);

  const entries = useMemo(() => {
    const queries = queryClient.getQueryCache().getAll();
    return queries.map(q => ({
      key: JSON.stringify(q.queryKey),
      queryKey: q.queryKey,
      status: q.state.status,
      isStale: q.isStale(),
      dataUpdatedAt: q.state.dataUpdatedAt,
      size: estimateSize(q.state.data),
      observers: q.getObserversCount(),
    })).sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, tick]);

  const totalSize = entries.reduce((s, e) => s + e.size, 0);
  const lastRefresh = entries.reduce((max, e) => Math.max(max, e.dataUpdatedAt || 0), 0);

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(prev => prev.size === entries.length ? new Set() : new Set(entries.map(e => e.key)));
  };

  const clearSelected = () => {
    if (selected.size === 0) return toast.error('Select at least one cached query');
    entries.filter(e => selected.has(e.key)).forEach(e => {
      queryClient.removeQueries({ queryKey: e.queryKey, exact: true });
    });
    toast.success(`Cleared ${selected.size} cached quer${selected.size === 1 ? 'y' : 'ies'}`);
    setSelected(new Set());
  };

  const clearAll = () => {
    if (!window.confirm('Clear the entire client-side cache? Every page will re-fetch fresh data on next visit.')) return;
    queryClient.clear();
    toast.success('All client cache cleared');
  };

  const refreshAll = async () => {
    toast.loading('Refreshing active queries…', { id: 'refresh-cache' });
    await queryClient.refetchQueries({ type: 'active' });
    toast.success('Active queries refreshed', { id: 'refresh-cache' });
  };

  const revalidateAll = async () => {
    await queryClient.invalidateQueries();
    toast.success('All cached queries marked stale — they will refetch next time each page is visited');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cache Management</h1>
          <p className="page-subtitle">Inspect and control the application&apos;s client-side (React Query) cache. This never touches Supabase itself.</p>
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
          <Database size={24} className="text-blue-600" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-icon bg-blue-500"><Database size={20} /></div>
          <div><p className="stat-value">{entries.length}</p><p className="stat-label">Cached Queries</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-purple-500"><Database size={20} /></div>
          <div><p className="stat-value">{formatBytes(totalSize)}</p><p className="stat-label">Approx. Cache Size</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-green-500"><RefreshCw size={20} /></div>
          <div><p className="stat-value text-base">{formatTime(lastRefresh)}</p><p className="stat-label">Last Refresh</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-amber-500"><AlertTriangle size={20} /></div>
          <div><p className="stat-value">{entries.filter(e => e.isStale).length}</p><p className="stat-label">Stale Entries</p></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <button onClick={refreshAll} className="btn-primary flex items-center gap-2"><RefreshCw size={16} /> Refresh Active Queries</button>
        <button onClick={revalidateAll} className="btn-secondary flex items-center gap-2"><RotateCcw size={16} /> Revalidate All</button>
        <button onClick={clearSelected} className="btn-secondary flex items-center gap-2"><Trash2 size={16} /> Clear Selected ({selected.size})</button>
        <button onClick={clearAll} className="btn-danger flex items-center gap-2"><Trash2 size={16} /> Clear All Cache</button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <button onClick={toggleSelectAll} className="p-1">
                    {selected.size === entries.length && entries.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th>Query Key</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Size</th>
                <th>Active Observers</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No cached queries yet.</td></tr>
              ) : (
                entries.map(e => (
                  <tr key={e.key}>
                    <td>
                      <button onClick={() => toggleSelect(e.key)} className="p-1">
                        {selected.has(e.key) ? <CheckSquare size={16} className="text-primary-600" /> : <Square size={16} className="text-gray-300" />}
                      </button>
                    </td>
                    <td className="text-xs font-mono max-w-xs truncate" title={e.key}>{e.key}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        e.status === 'success' ? (e.isStale ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700')
                        : e.status === 'pending' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {e.status === 'success' ? (e.isStale ? 'stale' : 'fresh') : e.status}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{formatTime(e.dataUpdatedAt)}</td>
                    <td className="text-xs text-gray-500">{formatBytes(e.size)}</td>
                    <td className="text-xs text-gray-500">{e.observers}</td>
                    <td>
                      <button
                        onClick={() => { queryClient.removeQueries({ queryKey: e.queryKey, exact: true }); toast.success('Cleared'); }}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Clear this query's cache"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
