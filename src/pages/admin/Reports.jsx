import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import managerService from '../../services/managerService';
import ledgerService from '../../services/ledgerService';
import warehouseService from '../../services/warehouseService';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, Users, Sprout, Wheat, Receipt, Wallet, MapPin, Warehouse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { downloadPDFReport } from '../../utils/pdfExport';
import { CACHE_TIMES } from '../../lib/queryConfig';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7days', label: 'Last 7 Days' },
  { id: '30days', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom Range' },
];

const REPORT_TYPES = [
  { id: 'farmer_registrations', title: 'Farmer Registrations', icon: <Users size={18} /> },
  { id: 'seed_purchases', title: 'Seed Purchases', icon: <Sprout size={18} /> },
  { id: 'grain_sales', title: 'Grain Sales', icon: <Wheat size={18} /> },
  { id: 'transactions', title: 'Transactions', icon: <Receipt size={18} /> },
  { id: 'credit_ledger', title: 'Credit Ledger', icon: <Wallet size={18} /> },
  { id: 'farm_visits', title: 'Farm Visits', icon: <MapPin size={18} /> },
  { id: 'warehouse_inventory', title: 'Warehouse Inventory', icon: <Warehouse size={18} /> },
];

function getDateBounds(range, customStart, customEnd) {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  if (range === 'today') return { start: startOfDay(now), end: endOfDay(now) };
  if (range === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { start: startOfDay(y), end: endOfDay(y) };
  }
  if (range === '7days') {
    const s = new Date(now); s.setDate(s.getDate() - 6);
    return { start: startOfDay(s), end: endOfDay(now) };
  }
  if (range === '30days') {
    const s = new Date(now); s.setDate(s.getDate() - 29);
    return { start: startOfDay(s), end: endOfDay(now) };
  }
  if (range === 'custom' && customStart && customEnd) {
    return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
  }
  return null; // no filter
}

export default function Reports() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [reportType, setReportType] = useState('farmer_registrations');
  const [dateRange, setDateRange] = useState('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboard(),
    ...CACHE_TIMES.SHORT
  });

  // One query per report type, only enabled when it's the active selection
  const { data: farmersData = [] } = useQuery({ queryKey: ['report-farmers'], queryFn: () => adminService.getFarmers(), enabled: reportType === 'farmer_registrations', ...CACHE_TIMES.MEDIUM });
  const { data: seedPurchasesData = [] } = useQuery({ queryKey: ['report-seed-purchases'], queryFn: () => adminService.getSeedPurchases(), enabled: reportType === 'seed_purchases', ...CACHE_TIMES.MEDIUM });
  const { data: grainSalesData = [] } = useQuery({ queryKey: ['report-grain-sales'], queryFn: () => managerService.getGrainSales(), enabled: reportType === 'grain_sales', ...CACHE_TIMES.MEDIUM });
  const { data: transactionsData = [] } = useQuery({ queryKey: ['report-transactions'], queryFn: () => ledgerService.getTransactions(), enabled: reportType === 'transactions' || reportType === 'credit_ledger', ...CACHE_TIMES.MEDIUM });
  const { data: farmVisitsData = [] } = useQuery({ queryKey: ['report-visits'], queryFn: () => managerService.getVisits(user?.id, user?.role), enabled: reportType === 'farm_visits', ...CACHE_TIMES.MEDIUM });
  const { data: warehousesData = [] } = useQuery({ queryKey: ['report-warehouses'], queryFn: () => warehouseService.getWarehouses(), enabled: reportType === 'warehouse_inventory', ...CACHE_TIMES.LONG });

  const bounds = useMemo(() => getDateBounds(dateRange, customStart, customEnd), [dateRange, customStart, customEnd]);

  const inRange = (dateStr) => {
    if (!bounds || !dateStr) return true;
    const d = new Date(dateStr);
    return d >= bounds.start && d <= bounds.end;
  };

  const reportConfig = useMemo(() => {
    switch (reportType) {
      case 'farmer_registrations': {
        const rows = farmersData.filter(f => inRange(f.created_at));
        return {
          columns: ['Name', 'Email', 'Phone', 'Address', 'Acres', 'Status', 'Registered On'],
          rows: rows.map(f => [f.name || '-', f.email || '-', f.phone || '-', f.address || '-', f.acres_of_land || 0, f.status, f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN') : '-']),
          summary: [`Total Farmers: ${rows.length}`, `Active: ${rows.filter(r => r.status === 'active').length}`, `Pending: ${rows.filter(r => r.status === 'pending').length}`],
        };
      }
      case 'seed_purchases': {
        const rows = seedPurchasesData.filter(s => inRange(s.created_at));
        const total = rows.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
        return {
          columns: ['Farmer', 'Seed', 'Qty (Quintals)', 'Price/kg', 'Total Amount', 'Payment', 'Date'],
          rows: rows.map(s => [s.farmer_name || '-', s.seed_name || '-', s.quantity_kg || 0, `Rs. ${s.price_per_kg || 0}`, `Rs. ${s.total_amount || 0}`, s.payment_status, s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '-']),
          summary: [`Total Purchases: ${rows.length}`, `Total Amount: Rs. ${total.toLocaleString('en-IN')}`],
        };
      }
      case 'grain_sales': {
        const rows = grainSalesData.filter(g => inRange(g.created_at));
        const total = rows.reduce((sum, g) => sum + parseFloat(g.total_amount || 0), 0);
        return {
          columns: ['Farmer', 'Grain', 'Grade', 'Good Qty (Quintals)', 'Price/kg', 'Total Amount', 'Status', 'Date'],
          rows: rows.map(g => [g.farmer_name || '-', g.grain_type || '-', g.grade || '-', g.good_material_kg || 0, `Rs. ${g.price_per_kg || 0}`, `Rs. ${g.total_amount || 0}`, g.status, g.created_at ? new Date(g.created_at).toLocaleDateString('en-IN') : '-']),
          summary: [`Total Sales: ${rows.length}`, `Total Amount: Rs. ${total.toLocaleString('en-IN')}`],
        };
      }
      case 'transactions': {
        const rows = transactionsData.filter(tx => inRange(tx.created_at));
        const credit = rows.filter(r => r.direction === 'credit').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
        const debit = rows.filter(r => r.direction === 'debit').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
        return {
          columns: ['Farmer', 'Type', 'Amount', 'Status', 'Description', 'Date'],
          rows: rows.map(tx => [tx.farmer_name || '-', tx.direction, `Rs. ${parseFloat(tx.amount || 0).toLocaleString('en-IN')}`, tx.status, tx.description || '-', new Date(tx.created_at).toLocaleDateString('en-IN')]),
          summary: [`Total Transactions: ${rows.length}`, `Total Credit: Rs. ${credit.toLocaleString('en-IN')}`, `Total Debit: Rs. ${debit.toLocaleString('en-IN')}`],
        };
      }
      case 'credit_ledger': {
        const rows = transactionsData.filter(tx => tx.direction === 'credit' && inRange(tx.created_at));
        const total = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
        return {
          columns: ['Farmer', 'Amount', 'Status', 'Description', 'Date'],
          rows: rows.map(tx => [tx.farmer_name || '-', `Rs. ${parseFloat(tx.amount || 0).toLocaleString('en-IN')}`, tx.status, tx.description || '-', new Date(tx.created_at).toLocaleDateString('en-IN')]),
          summary: [`Total Credits: ${rows.length}`, `Total Paid to Farmers: Rs. ${total.toLocaleString('en-IN')}`],
        };
      }
      case 'farm_visits': {
        const rows = farmVisitsData.filter(v => inRange(v.scheduled_date || v.created_at));
        return {
          columns: ['Farmer', 'Crop', 'Manager', 'Visit #', 'Scheduled Date', 'Status'],
          rows: rows.map(v => [v.farmer_name || '-', v.crop_type || '-', v.manager_name || 'Unassigned', v.visit_month, v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString('en-IN') : '-', v.status]),
          summary: [`Total Visits: ${rows.length}`, `Completed: ${rows.filter(r => r.status === 'completed').length}`, `Scheduled: ${rows.filter(r => r.status === 'scheduled').length}`],
        };
      }
      case 'warehouse_inventory': {
        const rows = warehousesData; // point-in-time snapshot, not date-filtered
        const totalCap = rows.reduce((s, w) => s + parseFloat(w.total_capacity_kg || 0), 0);
        const totalUsed = rows.reduce((s, w) => s + parseFloat(w.current_load_kg || 0), 0);
        return {
          columns: ['Warehouse', 'Address', 'Capacity (Quintals)', 'Used (Quintals)', 'Available (Quintals)', 'Utilization'],
          rows: rows.map(w => {
            const cap = parseFloat(w.total_capacity_kg || 0), used = parseFloat(w.current_load_kg || 0);
            return [w.name, w.address || '-', (cap / 100).toFixed(1), (used / 100).toFixed(1), ((cap - used) / 100).toFixed(1), cap ? `${((used / cap) * 100).toFixed(0)}%` : '-'];
          }),
          summary: [`Total Warehouses: ${rows.length}`, `Total Capacity: ${(totalCap / 100).toLocaleString('en-IN')} Quintals`, `Total Used: ${(totalUsed / 100).toLocaleString('en-IN')} Quintals`],
        };
      }
      default:
        return { columns: [], rows: [], summary: [] };
    }
  }, [reportType, farmersData, seedPurchasesData, grainSalesData, transactionsData, farmVisitsData, warehousesData, bounds]);

  const rangeLabel = DATE_RANGES.find(r => r.id === dateRange)?.label || 'All Time';
  const reportMeta = REPORT_TYPES.find(r => r.id === reportType);

  const handleDownload = () => {
    if (reportConfig.rows.length === 0) return toast.error('No data found for the selected range.');
    downloadPDFReport({
      title: reportMeta.title,
      filtersText: reportType === 'warehouse_inventory' ? 'Point-in-time snapshot' : `Period: ${rangeLabel}`,
      summary: reportConfig.summary,
      columns: reportConfig.columns,
      rows: reportConfig.rows,
    }, `AgriFlow_${reportMeta.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`);
    toast.success('Report downloaded');
  };

  if (dashLoading) return <LoadingSpinner />;

  const monthlySales = [...(dashData?.monthlySales || [])].reverse().map(m => ({ month: m.month?.slice(0, 7) || '', Total: m.total || 0 }));
  const dummyCropData = [{ name: 'Rice', value: 45 }, { name: 'Wheat', value: 25 }, { name: 'Cotton', value: 15 }, { name: 'Maize', value: 10 }, { name: 'Other', value: 5 }];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('reports')}</h1><p className="page-subtitle">{t('reports_desc')}</p></div>
      </div>

      <div className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-2' : ''} gap-6 mb-6`}>
        {isSuperAdmin && (
          <div className="section-card">
            <h3 className="section-title">{t('revenue_by_month')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="Total" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="section-card">
          <h3 className="section-title">{t('active_crop_distribution')}</h3>
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

      {/* Report builder */}
      <div className="section-card">
        <h3 className="section-title">Daily Reports</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
          {REPORT_TYPES.map(r => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${reportType === r.id ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
            >
              {r.icon}
              <span className="text-[11px] font-semibold leading-tight">{r.title}</span>
            </button>
          ))}
        </div>

        {reportType !== 'warehouse_inventory' && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {DATE_RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={`tab-btn ${dateRange === r.id ? 'active' : ''}`}
              >
                {r.label}
              </button>
            ))}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input-field py-1.5 text-sm" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input-field py-1.5 text-sm" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-700">{reportMeta.title}</p>
            <p className="text-xs text-gray-500">{reportConfig.rows.length} record(s) found{reportType !== 'warehouse_inventory' ? ` · ${rangeLabel}` : ''}</p>
          </div>
          <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
            <Download size={16} /> Download PDF
          </button>
        </div>

        <div className="table-container max-h-96 overflow-y-auto">
          <table className="data-table">
            <thead><tr>{reportConfig.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {reportConfig.rows.length === 0 ? (
                <tr><td colSpan={reportConfig.columns.length} className="text-center py-10 text-gray-400">No records found for this selection.</td></tr>
              ) : (
                reportConfig.rows.slice(0, 50).map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j} className="text-sm">{cell}</td>)}</tr>
                ))
              )}
            </tbody>
          </table>
          {reportConfig.rows.length > 50 && (
            <p className="text-center text-xs text-gray-400 py-3">Showing first 50 of {reportConfig.rows.length} — full data included in the downloaded PDF.</p>
          )}
        </div>
      </div>
    </div>
  );
}
