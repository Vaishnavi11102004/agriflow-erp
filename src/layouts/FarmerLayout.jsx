import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Sprout, ShoppingCart, Calendar,
  History, User, LogOut, Menu, X, Globe, ChevronDown,
  MessageCircle, Leaf
} from 'lucide-react';
import api from '../services/api/axios';
import toast from 'react-hot-toast';
import NotificationCenter from '../components/shared/NotificationCenter';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

export default function FarmerLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('sidebar_open') !== 'false');
  const [showLang, setShowLang] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { from: 'bot', text: 'Hello! I can help you with current crop prices and market forecasts. Ask me anything!' }
  ]);
  const [marketRates, setMarketRates] = useState([]);

  const navItems = [
    { to: '/farmer', icon: <LayoutDashboard size={18} />, label: t('farm_overview'), end: true },
    { to: '/farmer/crops', icon: <Sprout size={18} />, label: t('crops_cycles') },
    { to: '/farmer/seeds', icon: <ShoppingCart size={18} />, label: t('seed_purchase') },
    { to: '/farmer/booking-slots', icon: <Calendar size={18} />, label: t('booking_slot') },
    { to: '/farmer/transactions', icon: <History size={18} />, label: t('transaction_history') },
    { to: '/farmer/profile', icon: <User size={18} />, label: t('profile_settings') },
  ];

  useEffect(() => {
    localStorage.setItem('sidebar_open', sidebarOpen);
  }, [sidebarOpen]);

  useEffect(() => {
    api.get('/farmer/market-rates').then(r => setMarketRates(r.data)).catch(() => {});
  }, []);

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('agro_lang', code);
    setShowLang(false);
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    const msg = chatMsg.trim();
    setChatMsg('');
    setChatHistory(h => [...h, { from: 'user', text: msg }]);

    // Simple rule-based bot
    const lower = msg.toLowerCase();
    let response = '';
    const cropMatch = marketRates.find(r => lower.includes(r.crop_type.toLowerCase()));

    if (cropMatch) {
      const related = marketRates.filter(r => r.crop_type === cropMatch.crop_type);
      response = `📊 Current rates for ${cropMatch.crop_type}:\n` +
        related.map(r => `Grade ${r.grade}: ₹${r.price_per_kg}/kg`).join('\n') +
        '\n\nForecast: Prices expected to rise 5-8% next month due to seasonal demand.';
    } else if (lower.includes('price') || lower.includes('rate') || lower.includes('market')) {
      response = '📈 Here are today\'s rates:\n' +
        [...new Set(marketRates.map(r => r.crop_type))].slice(0, 5)
          .map(ct => { const a = marketRates.find(r => r.crop_type === ct && r.grade === 'A'); return `${ct}: ₹${a?.price_per_kg || 'N/A'}/kg (Grade A)`; })
          .join('\n');
    } else if (lower.includes('forecast') || lower.includes('future')) {
      response = '🔮 Market Forecast:\n• Rice: +6% next month\n• Wheat: Stable\n• Cotton: +10% (festive season)\n• Maize: -3% (surplus)\nSource: Agricultural Price Index 2024';
    } else {
      response = 'I can tell you about:\n• Current crop prices (e.g., "Rice price")\n• Market rates for any grain\n• Price forecasts\n\nJust ask!';
    }
    setTimeout(() => setChatHistory(h => [...h, { from: 'bot', text: response }]), 500);
  };

  return (
    <div className="flex h-screen overflow-hidden agro-bg">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        <div className="w-64 h-full bg-gradient-to-b from-agro-green to-agro-dark flex flex-col shadow-green">
          {/* Logo */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Leaf className="text-white" size={22} />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">AgriFlow ERP</h1>
                <p className="text-white/50 text-xs mt-0.5">{t('farmer_portal')}</p>
              </div>
            </div>
          </div>

          {/* Farmer info */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-400 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-white/50 text-xs">{user?.phone}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                {item.icon}<span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-white/10">
            <button onClick={handleLogout}
              className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/20">
              <LogOut size={18} /><span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm z-50">
          <button onClick={() => setSidebarOpen(v => !v)} className="btn-icon">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h2 className="text-gray-700 font-semibold text-base flex-1 hidden sm:block">
            {t('app_name')} — {t('farm_overview')}
          </h2>

          <div className="flex items-center gap-2 ml-auto">
            {/* Language Switcher */}
            <div className="relative">
              <button onClick={() => { setShowLang(v => !v); }}
                className="btn-icon flex items-center gap-1.5 text-sm font-medium">
                <Globe size={18} />
                <span className="hidden sm:block">{LANGUAGES.find(l => l.code === i18n.language)?.flag}</span>
              </button>
              {showLang && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 py-2 w-40 z-50">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => changeLang(l.code)}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-primary-50 flex items-center gap-2
                        ${i18n.language === l.code ? 'text-primary-700 font-semibold' : 'text-gray-700'}`}>
                      <span>{l.flag}</span><span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <NotificationCenter />
            
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Chatbot */}
      <div className="fixed bottom-6 right-6 z-40">
        {chatOpen && (
          <div className="mb-3 bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 flex flex-col overflow-hidden animate-fade-in">
            <div className="bg-agro-green text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} />
                <span className="font-semibold text-sm">{t('chatbot')}</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-60">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-3 py-2 rounded-xl text-xs max-w-[85%] whitespace-pre-line leading-relaxed
                    ${m.from === 'user' ? 'bg-agro-green text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex gap-2">
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder={t('ask_market')} className="input-field py-2 text-xs flex-1" />
              <button onClick={sendChat} className="btn-primary py-2 px-3 text-xs">➤</button>
            </div>
          </div>
        )}
        <button onClick={() => setChatOpen(v => !v)}
          className="w-14 h-14 bg-agro-green hover:bg-primary-700 text-white rounded-full shadow-green flex items-center justify-center transition-all duration-300 active:scale-95">
          {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </button>
      </div>
    </div>
  );
}
