import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Package, Warehouse, BarChart2,
  Calendar, MapPin, TrendingUp, Wheat, LogOut, Menu, X,
  Globe, Shield, ChevronRight, Leaf, User, FileText
} from 'lucide-react';
import api from '../services/api/axios';
import NotificationCenter from '../components/shared/NotificationCenter';
import LiveMarketRatesWidget from '../components/shared/LiveMarketRatesWidget';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('admin_sidebar') !== 'false');
  const [showLang, setShowLang] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin/dashboard/operational')
    ? '/admin/dashboard/operational'
    : '/manager/dashboard';
  const navItems = [
    { to: `${basePath}`, icon: <LayoutDashboard size={18} />, label: t('dashboard'), end: true, roles: ['manager', 'super_admin'] },
    { to: `${basePath}/farmers`, icon: <Users size={18} />, label: t('farmers'), roles: ['manager', 'super_admin'] },
    { to: `${basePath}/seeds`, icon: <Package size={18} />, label: t('seeds_inventory'), roles: ['manager', 'super_admin'] },
    { to: `${basePath}/warehouse`, icon: <Warehouse size={18} />, label: t('warehouse'), roles: ['manager', 'super_admin'] },
    { to: `${basePath}/booking-slots`, icon: <Calendar size={18} />, label: t('booking_slot'), roles: ['manager', 'super_admin'] },
    { to: `${basePath}/visits`, icon: <MapPin size={18} />, label: t('farm_visits'), roles: ['manager', 'super_admin'] },
    { to: `${basePath}/reports`, icon: <BarChart2 size={18} />, label: t('reports'), roles: ['manager', 'super_admin'] },
    { to: `${basePath}/market-rates`, icon: <TrendingUp size={18} />, label: t('market_rates'), roles: ['manager', 'super_admin'] },
    { to: `${basePath}/grain-sales`, icon: <Wheat size={18} />, label: t('grain_sales'), roles: ['super_admin'] },
    { to: `${basePath}/event-logs`, icon: <FileText size={18} />, label: t('event_logs'), roles: ['super_admin'] },
    { to: `${basePath}/profile`, icon: <User size={18} />, label: t('profile_settings'), roles: ['manager', 'super_admin'] },
    { to: `/admin/dashboard`, icon: <Shield size={18} />, label: t('super_admin_portal'), roles: ['super_admin'] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(user?.role));

  useEffect(() => { localStorage.setItem('admin_sidebar', sidebarOpen); }, [sidebarOpen]);

  const changeLang = (code) => { i18n.changeLanguage(code); localStorage.setItem('agro_lang', code); setShowLang(false); };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)' }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        <div className="w-64 h-full bg-gradient-to-b from-primary-800 to-primary-950 flex flex-col shadow-xl">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">AgriFlow ERP</h1>
                <p className="text-white/50 text-xs mt-0.5">Manager Portal</p>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                <span className="badge-green text-[10px]">Manager</span>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleNavItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                {item.icon}<span className="flex-1">{item.label}</span>
                {item.badge && <span className="ml-auto badge bg-red-500 text-white text-[10px]">{item.badge}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10">
            <button onClick={() => { logout(); navigate('/manager'); }}
              className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/20">
              <LogOut size={18} /><span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm z-50">
          <button onClick={() => setSidebarOpen(v => !v)} className="btn-icon">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1">
            <span className="text-gray-600 text-sm font-medium">Manager Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowLang(v => !v)} className="btn-icon flex items-center gap-1">
                <Globe size={18} />
              </button>
              {showLang && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 py-2 w-40 z-50">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => changeLang(l.code)}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-primary-50 flex items-center gap-2 ${i18n.language === l.code ? 'text-primary-700 font-semibold' : 'text-gray-700'}`}>
                      <span>{l.flag}</span><span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <NotificationCenter />
            
            <div className="pl-2 border-l border-gray-200 ml-1">
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <LiveMarketRatesWidget />
    </div>
  );
}
