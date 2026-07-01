import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { FileText, Search, Download, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EventLogs() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading: loading } = useQuery({
    queryKey: ['admin-event-logs'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        return (res.data || []).map(log => ({
          id: log.id,
          action: log.action,
          entity: log.entity_type ? `${log.entity_type}#${log.entity_id}` : '-',
          timestamp: new Date(log.created_at).getTime() / 1000,
          details: log.details || '-',
          manager: log.name || 'System',
          role: log.role || '-',
        }));
      } catch (err) {
        console.error("Failed to fetch event logs:", err);
        return [];
      }
    }
  });

  const filtered = logs.filter(l => l.action.toLowerCase().includes(search.toLowerCase()) || l.entity.toLowerCase().includes(search.toLowerCase()) || l.details.toLowerCase().includes(search.toLowerCase()) || l.manager.toLowerCase().includes(search.toLowerCase()));

  const downloadReport = () => {
    if (filtered.length === 0) {
      toast.error(t('no_logs_found') || 'No event logs to download');
      return;
    }

    const title = 'System Event Logs';
    const tableHeaders = ['Timestamp', 'Manager', 'Action', 'Entity Affected', 'Details'];
    
    const tableRows = filtered.map(l => {
      const date = new Date(l.timestamp * 1000).toLocaleString('en-IN');
      return `<tr>
        <td>${date}</td>
        <td>${l.manager}</td>
        <td>${l.action}</td>
        <td>${l.entity}</td>
        <td>${l.details}</td>
      </tr>`;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; background: #f8fafc; }
        .report-container { background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 1000px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
        .report-title { font-size: 24px; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 1px; }
        .meta { font-size: 14px; color: #64748b; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { text-align: left; padding: 12px; background: #f1f5f9; color: #475569; font-size: 13px; text-transform: uppercase; border-radius: 4px; border: 1px solid #e2e8f0; }
        td { padding: 12px; border: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <div class="logo">🌱 AgriFlow</div>
            <div class="report-title">${title}</div>
        </div>
        <div class="meta">
            <strong>Generated On:</strong> ${new Date().toLocaleString('en-IN')}<br>
            <strong>Status:</strong> Official Log Export
        </div>
        <table>
            <thead>
                <tr>
                    ${tableHeaders.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        <div class="footer">
            AgriFlow Management System &copy; ${new Date().getFullYear()}<br>
            <small>This log export is system generated.</small>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EventLogs_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(t('logs_downloaded') || 'Logs downloaded successfully');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-3xl font-bold text-gray-900">{t("event_logs") || "Event Logs"}</h1><p className="text-gray-500 mt-1">{t("event_logs_desc") || "View all actions and work done by managers"}</p></div>
        <button onClick={downloadReport} className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl flex items-center gap-2 transition-colors border border-gray-200 shadow-sm"><Download size={16} />{t("export_report", "Export Report")}</button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_logs_placeholder") || "Search by action or farmer..."} className="input-field pl-11 py-3" />
        </div>
        <button className="px-4 py-3 bg-white border border-gray-200 text-gray-600 hover:text-primary-600 rounded-xl flex items-center gap-2 transition-colors shadow-sm"><Filter size={18} />{t("filter") || "Filter"}</button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("timestamp") || "Timestamp"}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("manager") || "Manager"}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("action") || "Action"}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("entity_affected") || "Farmer / Entity"}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("details") || "Details"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={5} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">{t("no_logs_found") || "No event logs found"}</td></tr>
                  : filtered.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-600 text-sm">{new Date(l.timestamp * 1000).toLocaleString()}</td>
                      <td className="p-4 font-semibold text-gray-800">{l.manager}</td>
                      <td className="p-4 font-semibold text-gray-800">{l.action}</td>
                      <td className="p-4 text-gray-600 font-medium">{l.entity}</td>
                      <td className="p-4 text-gray-500 text-sm">{l.details}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
