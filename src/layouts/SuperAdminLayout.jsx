import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, UserCheck, FileText, LogOut, Menu, X, Globe, Crown, Leaf } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

export default function SuperAdminLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLang, setShowLang] = useState(false);

  const navItems = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: t('dashboard'), end: true },
    { to: '/admin/dashboard/managers', icon: <UserCheck size={18} />, label: t('manage_admins') },
    { to: '/admin/dashboard/farmers', icon: <Users size={18} />, label: t('farmers') },
    { to: '/admin/dashboard/operational', icon: <LayoutDashboard size={18} />, label: t('operational_portal') },
  ];

  const changeLang = (code) => { i18n.changeLanguage(code); localStorage.setItem('agro_lang', code); setShowLang(false); };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)' }}>
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        <div className="w-64 h-full bg-gradient-to-b from-primary-800 to-primary-950 flex flex-col shadow-xl">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gold-500 to-gold-700 rounded-xl flex items-center justify-center">
                <Crown className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">AgriFlow ERP</h1>
                <p className="text-white/50 text-xs mt-0.5">Super Admin</p>
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
                <span className="badge-green text-[10px]">Super Admin</span>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                {item.icon}<span className="flex-1">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10">
            <button onClick={() => { logout(); navigate('/admin'); }}
              className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/20">
              <LogOut size={18} /><span>Logout</span>
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
            <span className="text-gray-600 text-sm font-medium">Super Admin Control Panel</span>
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
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
