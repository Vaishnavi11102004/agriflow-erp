import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import ledgerService from '../../services/ledgerService';
import { CACHE_TIMES } from '../../lib/queryConfig';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Sprout, IndianRupee, Warehouse, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function StatCard({ icon, value, label, color, sub }) {
  return (
    <div className="stat-card hover-lift">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const { data, isLoading: loading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboard(),
    ...CACHE_TIMES.SHORT
  });

  const handlePayFarmer = async (txId) => {
    try {
      await ledgerService.processPayment(txId, user?.id);
      toast.success(t('payment_processed_successfully'));
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    } catch (err) {
      toast.error(t('payment_failed'));
    }
  };

  if (loading) return <LoadingSpinner />;

  const monthlyData = (data?.monthlySales || []).reverse().map(m => ({
    month: m.month?.slice(0, 7) || '', revenue: m.total || 0
  }));

  const totalWh = data?.warehouses?.reduce((s, w) => s + w.total_capacity_kg, 0) || 1;
  const usedWh = data?.warehouses?.reduce((s, w) => s + w.current_load_kg, 0) || 0;
  const whPct = ((usedWh / totalWh) * 100).toFixed(1);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">{t('dashboard')}</h1>
        <p className="page-subtitle">{t("system_overview_desc")}</p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-8">
        <StatCard icon={<Users size={22} />} value={data?.totalFarmers || 0} label={t("total_farmers")} color="bg-blue-500" sub={`${data?.activeFarmers || 0}  ${t("active_farmers")}`} />
        <StatCard icon={<Sprout size={22} />} value={data?.activeCrops || 0} label={t("active_crop_cycles")} color="bg-agro-primary" />
        <StatCard icon={<TrendingUp size={22} />} value={`${((data?.procurementMTD || 0)/100).toFixed(1)} Qtl`} label={t("procurement_mtd")} color="bg-agro-brown" />
        <StatCard icon={<Warehouse size={22} />} value={`${((data?.warehouseInv || 0)/100).toFixed(1)} Qtl`} label={t("warehouse_inv")} color="bg-gray-600" />
        {isSuperAdmin && (
          <>
            <StatCard icon={<IndianRupee size={22} />} value={`₹${((data?.revenueMTD || 0)/1000).toFixed(0)}K`} label={t("total_revenue_mtd")} color="bg-agro-gold" />
            <StatCard icon={<IndianRupee size={22} />} value={`₹${((data?.profitMTD || 0)/1000).toFixed(0)}K`} label={t("net_profit_mtd")} color="bg-agro-success" />
            <StatCard icon={<Clock size={22} />} value={data?.pendingPayments || 0} label={t("pending_payments")} color="bg-agro-warning" />
          </>
        )}
        <StatCard icon={<Users size={22} />} value={data?.visitorToday || 0} label={t("visitors_today")} color="bg-purple-500" />
      </div>
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart - Only for Super Admin */}
        {isSuperAdmin && (
          <div className="section-card lg:col-span-2">
            <h3 className="section-title"><TrendingUp size={18} className="text-primary-600" />{t("monthly_revenue")}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Warehouse Status */}
        <div className={`section-card ${isSuperAdmin ? '' : 'lg:col-span-3'}`}>
          <h3 className="section-title"><Warehouse size={18} className="text-blue-500" />{t("warehouse_capacity")}</h3>
          <div className="flex flex-col items-center py-4">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none"
                  stroke={parseFloat(whPct) > 80 ? '#ef4444' : parseFloat(whPct) > 60 ? '#f59e0b' : '#22c55e'} strokeWidth="3"
                  strokeDasharray={`${whPct}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-gray-800">{whPct}%</p>
                <p className="text-xs text-gray-400">{t("used")}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">{(usedWh / 100).toFixed(0)} Qtl / {(totalWh / 100).toFixed(0)} Qtl</p>
          </div>
          <div className="space-y-2 mt-2">
            {data?.warehouses?.map(w => {
              const pct = (w.current_load_kg / w.total_capacity_kg * 100);
              return (
                <div key={w.id}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{w.name}</span><span className="font-medium" title={`Used: ${(w.current_load_kg/100).toFixed(1)} Qtl / Total: ${(w.total_capacity_kg/100).toFixed(1)} Qtl`}>{pct.toFixed(0)}% used</span></div>
                  <div className="warehouse-bar"><div className={pct > 80 ? 'warehouse-fill-red' : pct > 60 ? 'warehouse-fill-yellow' : 'warehouse-fill-green'} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Approvals + Recent Transactions */}
      <div className="grid grid-cols-1 gap-6">


        <div className="section-card">
          <h3 className="section-title"><TrendingUp size={18} className="text-primary-600" />{t("recent_transactions")}</h3>
          <div className="space-y-3">
            {(data?.recentTx || []).slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${tx.direction === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                  {tx.direction === 'credit' ? '↑' : '↓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{tx.farmer_name}</p>
                  <p className="text-xs text-gray-400 truncate">{tx.description}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <p className={`text-sm font-bold ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    ₹{tx.amount.toLocaleString('en-IN')}
                  </p>
                  {tx.status === 'pending' && tx.direction === 'credit' && (
                    <button onClick={() => handlePayFarmer(tx.id)} className="mt-1 text-[10px] bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">
                      {t('pay_farmer')}
                    </button>
                  )}
                  {tx.status === 'completed' && <span className="text-[10px] text-gray-400 mt-1">{t("paid")}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
