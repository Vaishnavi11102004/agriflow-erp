import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api/axios';
import { useAuth } from '../../context/AuthContext';
import { Sprout, IndianRupee, ShoppingBag, Calendar, TrendingUp, ArrowRight, MapPin, Bell, AlertTriangle } from 'lucide-react';

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}


function StatCard({ icon, value, label, color, prefix }) {
  return (
    <div className="stat-card hover-lift">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <p className="stat-value">{prefix}{value}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );
}

export default function FarmerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['farmer-dashboard'],
    queryFn: async () => {
      const res = await api.get('/farmer/dashboard');
      return res.data;
    }
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );

  const cropCycleMonths = [
    { month: 1, label: t('sowing'), desc: t('verification_visit') },
    { month: 2, label: t('growth'), desc: t('monitoring') },
    { month: 3, label: t('maturity'), desc: t('progress_visit') },
    { month: 4, label: t('harvest'), desc: t('ready_to_sell') },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-agro-green to-primary-700 rounded-2xl p-6 mb-8 text-white relative overflow-hidden">
        <div className="absolute right-6 top-0 bottom-0 opacity-10 text-[120px] flex items-center">🌾</div>
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-medium">{t('good_greeting', { time: new Date().getHours() < 12 ? t('morning') : new Date().getHours() < 17 ? t('afternoon') : t('evening') })},</p>
          <h1 className="text-2xl font-bold mt-0.5">{user?.name} 👋</h1>
          <p className="text-white/60 text-sm mt-2">{t('dashboard_manage_desc')}</p>
        </div>
      </div>

      {/* Farm Visit Reminder Banner — shows only when a visit is ≤ 2 days away */}
      {(() => {
        const urgentVisits = data?.visits?.filter(v => {
          const days = getDaysUntil(v.scheduled_date);
          return days !== null && days <= 2 && days >= 0;
        }) || [];
        if (urgentVisits.length === 0) return null;
        return urgentVisits.map(v => {
          const days = getDaysUntil(v.scheduled_date);
          const isToday = days === 0;
          const isTomorrow = days === 1;
          return (
            <div key={v.id} className={`mb-6 rounded-2xl border-l-4 p-4 flex items-start gap-3 shadow-sm ${
              isToday
                ? 'bg-red-50 border-red-500'
                : isTomorrow
                ? 'bg-orange-50 border-orange-500'
                : 'bg-amber-50 border-amber-400'
            }`}>
              <div className={`p-2 rounded-xl flex-shrink-0 ${
                isToday ? 'bg-red-100' : isTomorrow ? 'bg-orange-100' : 'bg-amber-100'
              }`}>
                <Bell size={18} className={isToday ? 'text-red-600 animate-pulse' : isTomorrow ? 'text-orange-600' : 'text-amber-600'} />
              </div>
              <div className="flex-1">
                <p className={`font-bold text-sm ${
                  isToday ? 'text-red-700' : isTomorrow ? 'text-orange-700' : 'text-amber-700'
                }`}>
                  {isToday ? `🚨 ${t('visit_today')}` : isTomorrow ? `⚠️ ${t('visit_tomorrow')}` : `📅 ${t('visit_in_2_days')}`}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {t('field_officer_msg_pt1')}{' '}
                  <strong>{new Date(v.scheduled_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.
                  {' '}{t('field_officer_msg_pt2')}
                </p>
              </div>
            </div>
          );
        });
      })()}
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Sprout size={22} />} value={data?.crops || 0} label={t('active_fields')} color="bg-primary-500" />
        <StatCard icon={<IndianRupee size={22} />} value={(data?.totalEarned || 0).toLocaleString('en-IN')} label={t('total_earned')} color="bg-green-600" prefix="₹" />
        <StatCard icon={<ShoppingBag size={22} />} value={(data?.totalSpent || 0).toLocaleString('en-IN')} label={t('seed_investment')} color="bg-blue-500" prefix="₹" />
        <StatCard icon={<Calendar size={22} />} value={data?.visits?.length || 0} label={t('upcoming_visits')} color="bg-amber-500" />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Crop Cycle Explainer */}
        <div className="section-card">
          <h3 className="section-title"><Sprout size={18} className="text-primary-600" />{t('four_month_cycle')}</h3>
          <div className="flex items-center gap-2 mt-2">
            {cropCycleMonths.map((m, i) => (
              <div key={m.month} className="flex items-center flex-1">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className={`cycle-dot ${i < 2 ? 'done' : i === 2 ? 'active' : 'pending'}`}>M{m.month}</div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-700">{m.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{m.desc}</p>
                  </div>
                </div>
                {i < 3 && <div className={`h-0.5 w-6 flex-shrink-0 ${i < 2 ? 'bg-primary-400 cycle-line done' : 'bg-gray-200 cycle-line'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Visits */}
        <div className="section-card">
          <h3 className="section-title"><MapPin size={18} className="text-amber-500" />{t('upcoming_farm_visits')}</h3>
          {data?.visits?.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">{t('no_visits_scheduled')}</p>
            : data?.visits?.map(v => {
              const days = getDaysUntil(v.scheduled_date);
              return (
                <div key={v.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    days !== null && days <= 2 && days >= 0 ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    <Calendar size={16} className={days !== null && days <= 2 && days >= 0 ? 'text-red-600' : 'text-amber-600'} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{t('month_visit', { month: v.visit_month })}</p>
                    {v.scheduled_date ? (
                      <p className="text-xs text-gray-500">
                        {new Date(v.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">{t('date_tbd')}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-yellow">{v.status}</span>
                      {days === 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">{t('today_excl')}</span>}
                      {days === 1 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">{t('tomorrow')}</span>}
                      {days === 2 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{t('in_2_days')}</span>}
                      {days !== null && days > 2 && <span className="text-[10px] text-gray-400">{days} {t('days_away')}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Crops */}
        <div className="section-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0"><Sprout size={18} className="text-primary-600" />{t('recent_crops')}</h3>
            <Link to="/farmer/crops" className="text-primary-600 text-xs font-semibold hover:underline flex items-center gap-1">{t('view_all')} <ArrowRight size={12} /></Link>
          </div>
          {data?.recentCrops?.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">{t('no_crops_registered')}</p>
            : data?.recentCrops?.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">🌾</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{c.crop_type}</p>
                  <p className="text-xs text-gray-500">{c.acres} {t('acres')} • {t('sowed')} {c.sowing_date}</p>
                </div>
                <span className={`badge ${c.status === 'growing' ? 'badge-green' : c.status === 'harvested' ? 'badge-blue' : 'badge-gray'}`}>{c.status}</span>
              </div>
            ))
          }
        </div>

        {/* Recent Transactions */}
        <div className="section-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0"><TrendingUp size={18} className="text-blue-600" />{t('recent_transactions')}</h3>
            <Link to="/farmer/transactions" className="text-primary-600 text-xs font-semibold hover:underline flex items-center gap-1">{t('view_all')} <ArrowRight size={12} /></Link>
          </div>
          {data?.recentTx?.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">{t('no_transactions_yet')}</p>
            : data?.recentTx?.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${tx.direction === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {tx.direction === 'credit' ? '↑' : '↓'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <p className={`text-sm font-bold ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.direction === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                </p>
              </div>
            ))
          }
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: '/farmer/crops', icon: '🌱', label: t('register_crop'), color: 'bg-primary-50 border-primary-200' },
          { to: '/farmer/seeds', icon: '🛒', label: t('buy_seeds_btn'), color: 'bg-blue-50 border-blue-200' },
          { to: '/farmer/booking-slots', icon: '📅', label: t('book_slot'), color: 'bg-purple-50 border-purple-200' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${a.color} hover-lift cursor-pointer`}>
            <span className="text-3xl">{a.icon}</span>
            <span className="text-sm font-semibold text-gray-700">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
