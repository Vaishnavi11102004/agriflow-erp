import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Reports() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const { data, isLoading: loading } = useQuery({
    queryKey: ['admin-dashboard'], // Reuse dashboard cache since they fetch the same endpoint
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data;
    }
  });

  const downloadReport = async (type = 'full_report') => {
    try {
      let title = '';
      let tableHeaders = [];
      let tableRows = [];

      if (type === 'farmer_registration_data') {
        const res = await api.get('/admin/farmers');
        title = 'Farmer Registration Data';
        tableHeaders = ['ID', 'Name', 'Phone', 'Village', 'Aadhaar', 'Land (acres)', 'Joined Date'];
        tableRows = (res.data || []).map(f => [
          f.id, f.name || '-', f.phone || '-', f.village || '-', f.aadhaar_number || '-', f.land_acres || 0,
          f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN') : '-'
        ]);
      } else if (type === 'transaction_ledger') {
        const res = await api.get('/admin/grain-sales');
        title = 'Transaction Ledger';
        tableHeaders = ['ID', 'Farmer', 'Grain Type', 'Quantity (kg)', 'Price/kg', 'Total Amount', 'Status', 'Date'];
        tableRows = (res.data || []).map(s => [
          s.id, s.farmer_name || '-', s.grain_type || '-', s.quantity_kg || 0, `₹${s.price_per_kg || 0}`, `₹${s.total_amount || 0}`, s.status || '-',
          s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '-'
        ]);
      } else if (type === 'warehouse_inventory_logs') {
        const res = await api.get('/admin/warehouses');
        title = 'Warehouse Inventory Logs';
        tableHeaders = ['ID', 'Name', 'Location', 'Capacity (MT)', 'Used (MT)', 'Available (MT)', 'Manager'];
        tableRows = (res.data || []).map(w => [
          w.id, w.name || '-', w.location || '-', w.capacity_mt || 0, w.used_mt || 0, (w.capacity_mt || 0) - (w.used_mt || 0), w.manager_name || '-'
        ]);
      } else {
        const dashData = data || {};
        title = 'Full System Report';
        tableHeaders = ['Metric', 'Value'];
        tableRows = [
          ['Total Farmers', dashData.totalFarmers || 0],
          ['Active Crops', dashData.activeCrops || 0],
          ['Total Revenue', `₹${dashData.totalRevenue || 0}`],
          ['Pending Payments', dashData.pendingPayments || 0]
        ];
        if (dashData.monthlySales) {
          dashData.monthlySales.forEach(m => {
            tableRows.push([`Revenue ${m.month?.slice(0, 7) || ''}`, `₹${m.total || 0}`]);
          });
        }
      }

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
            <strong>Status:</strong> Official Report
        </div>
        <table>
            <thead>
                <tr>
                    ${tableHeaders.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
            </tbody>
        </table>
        <div class="footer">
            AgriFlow Management System &copy; ${new Date().getFullYear()}<br>
            <small>This report is system generated.</small>
        </div>
    </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t('report_downloaded'));
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download report');
    }
  };

  if (loading) return <LoadingSpinner />;

  const monthlySales = [...(data?.monthlySales || [])].reverse().map(m => ({ month: m.month?.slice(0, 7) || '', Total: m.total || 0 }));
  const dummyCropData = [ { name: 'Rice', value: 45 }, { name: 'Wheat', value: 25 }, { name: 'Cotton', value: 15 }, { name: 'Maize', value: 10 }, { name: 'Other', value: 5 } ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('reports')}</h1><p className="page-subtitle">{t("reports_desc")}</p></div>
        <button onClick={() => downloadReport('full_report')} className="btn-secondary flex items-center gap-2"><Download size={16} />{t("export_full_report")}</button>
      </div>

      <div className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-2' : ''} gap-6 mb-6`}>
        {isSuperAdmin && (
          <div className="section-card">
            <h3 className="section-title">{t("revenue_by_month")}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="Total" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="section-card">
          <h3 className="section-title">{t("active_crop_distribution")}</h3>
          <div className="flex items-center h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dummyCropData} innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value">
                  {dummyCropData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => [`${v}%`, 'Share']} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: 'farmer_registration_data', title: t('farmer_registration_data'), desc: t('farmer_registration_data_desc'), icon: <Calendar size={18} /> },
          { id: 'transaction_ledger', title: t('transaction_ledger'), desc: t('transaction_ledger_desc'), icon: <ArrowRight size={18} /> },
          { id: 'warehouse_inventory_logs', title: t('warehouse_inventory_logs'), desc: t('warehouse_inventory_logs_desc'), icon: <Download size={18} /> },
        ].map(r => (
          <div key={r.title} className="glass-card p-5 hover-lift cursor-pointer" onClick={() => downloadReport(r.id)}>
            <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mb-4">{r.icon}</div>
            <h4 className="font-bold text-gray-800 mb-1">{r.title}</h4>
            <p className="text-xs text-gray-500 mb-4">{r.desc}</p>
            <span className="text-sm font-semibold text-primary-600 flex items-center gap-1 group">{t("download_report", "Download Report")} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
          </div>
        ))}
      </div>
    </div>
  );
}
