import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Leaf, TrendingUp, ShoppingBag, Warehouse, ArrowRight, Star,
  Users, Sprout, BarChart3, ChevronRight, Phone, Menu, X,
  Shield, Clock, Award, Wheat, Package, BadgeCheck, Globe
} from 'lucide-react';
import api from '../../services/api/axios';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

const CROP_ICONS = { Rice: '🌾', Wheat: '🌿', Maize: '🌽', Cotton: '🌸', Soybean: '🫘', default: '🌱' };
const GRADE_COLOR = { A: 'text-primary-600 bg-primary-50', B: 'text-amber-600 bg-amber-50', C: 'text-orange-600 bg-orange-50' };
const SEED_COLORS = ['from-green-400 to-primary-600', 'from-amber-400 to-yellow-600', 'from-blue-400 to-cyan-600', 'from-purple-400 to-violet-600', 'from-rose-400 to-pink-600', 'from-teal-400 to-green-600', 'from-indigo-400 to-blue-600'];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLang, setShowLang] = useState(false);

  const { data: stats = { farmers: 0, crops: 0, seeds: 0, warehouses: 0 } } = useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const res = await api.get('/public/stats');
      return res.data;
    }
  });

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('agro_lang', code);
    setShowLang(false);
  };

  const handleActionClick = (action) => {
    if (user) {
      navigate(user.role === 'farmer' ? '/farmer' : '/manager/dashboard');
    } else {
      navigate('/login', { state: { from: action } });
    }
  };

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-primary-700 rounded-xl flex items-center justify-center shadow">
                <Leaf size={18} className="text-white" />
              </div>
              <span className="text-xl font-black text-primary-800 tracking-tight">AgriFlow ERP</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link to="/market-rates" className="hover:text-primary-700 transition-colors">{t('market_rates_nav')}</Link>
              <Link to="/seeds-catalog" className="hover:text-primary-700 transition-colors">{t('seeds_catalog_nav')}</Link>
              <Link to="/how-it-works" className="hover:text-primary-700 transition-colors">{t('how_it_works_nav')}</Link>
              <Link to="/features" className="hover:text-primary-700 transition-colors">{t('features_nav')}</Link>
            </div>

            {/* CTA Buttons + Lang */}
            <div className="hidden md:flex items-center gap-3">
              {/* Language Switcher */}
              <div className="relative">
                <button onClick={() => setShowLang(v => !v)} className="btn-icon flex items-center gap-1.5 text-sm font-medium">
                  <Globe size={18} />
                  <span>{LANGUAGES.find(l => l.code === i18n.language)?.flag}</span>
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
              {user ? (
                <button onClick={() => handleActionClick('dashboard')}
                  className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all active:scale-95">
                  {t('go_to_dashboard')} <ArrowRight size={15} />
                </button>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">
                    {t('login')}
                  </Link>
                  <Link to="/register" className="flex items-center gap-1.5 bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all active:scale-95 shadow-md shadow-primary-200">
                    {t('register')} <ArrowRight size={15} />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(v => !v)}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 animate-fade-in">
            <Link to="/market-rates" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('market_rates_nav')}</Link>
            <Link to="/seeds-catalog" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('seeds_catalog_nav')}</Link>
            <Link to="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('how_it_works_nav')}</Link>
            <Link to="/features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('features_nav')}</Link>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1 text-center py-2.5 border-2 border-primary-600 text-primary-700 rounded-xl text-sm font-semibold">{t('login')}</Link>
              <Link to="/register" className="flex-1 text-center py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold">{t('register')}</Link>
            </div>
            {/* Language switcher in mobile */}
            <div className="flex gap-2 pt-1">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => changeLang(l.code)}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-all ${i18n.language === l.code ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden text-white" style={{ minHeight: '92vh' }}>

        {/* === Village background video === */}
        <div className="absolute inset-0">
          <video
            src="/videos/farm-bg.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.55) saturate(1.2)' }}
          />
        </div>
        {/* Dark gradient overlay for readability and fade into next section */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        {/* === Content === */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center pt-12" style={{ minHeight: '92vh', paddingBottom: '140px' }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left – text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-full px-4 py-1.5 text-sm font-medium text-primary-200 mb-6 shadow-lg">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                🇮🇳 {t('india_agri_marketplace')}
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6 drop-shadow-xl">
                {t('buy_seeds_hero')}.<br />
                <span className="text-amber-400 drop-shadow-lg">{t('sell_grains_hero')}.</span><br />
                <span className="text-primary-300">{t('grow_better')}.</span>
              </h1>

              <p className="text-lg text-white/80 mb-8 leading-relaxed max-w-xl backdrop-blur-sm">{t('hero_desc_full')}</p>

              <div className="flex flex-wrap gap-4 mb-6">
                <button onClick={() => handleActionClick('buy')}
                  className="flex items-center gap-2 bg-amber-400 text-gray-900 px-8 py-4 rounded-2xl font-bold text-base hover:bg-amber-300 active:scale-95 transition-all shadow-2xl shadow-amber-500/40 hover:shadow-amber-400/60">
                  <ShoppingBag size={20} /> {t('buy_seeds_btn_short')}
                </button>
                <button onClick={() => handleActionClick('sell')}
                  className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/40 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-white/30 active:scale-95 transition-all shadow-xl">
                  <TrendingUp size={20} /> {t('sell_grains_btn_short')}
                </button>
              </div>

              <p className="text-white/50 text-xs">{t('hero_badges')}</p>
            </div>

            {/* Right – glassmorphism stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:ml-auto w-max">
              {[
                { icon: Users, labelKey: 'active_farmers', value: stats.farmers, color: 'from-primary-400 to-green-600', glow: 'shadow-primary-500/30' },
                { icon: Sprout, labelKey: 'active_fields', value: stats.crops, color: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/30' },
                { icon: Package, labelKey: 'seeds_inventory', value: stats.seeds, color: 'from-blue-400 to-cyan-600', glow: 'shadow-blue-500/30' },
                { icon: Warehouse, labelKey: 'warehouse', value: stats.warehouses, color: 'from-purple-400 to-violet-600', glow: 'shadow-purple-500/30' },
              ].map((s, i) => (
                <div key={i}
                  className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all hover:-translate-y-2 shadow-xl ${s.glow} cursor-default`}>
                  <span className={`inline-flex w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} items-center justify-center mb-3 shadow-lg`}>
                    <s.icon size={16} className="text-white" />
                  </span>
                  <p className="text-4xl font-black text-white drop-shadow">{s.value}+</p>
                  <p className="text-white/60 text-xs font-medium mt-1">{t(s.labelKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-16 bg-gradient-to-br from-primary-800 to-green-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">{t('start_journey')}</h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 bg-amber-400 text-gray-900 px-8 py-4 rounded-2xl font-bold text-base hover:bg-amber-300 active:scale-95 transition-all shadow-lg">
              {t('register_free')} <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-white/25 active:scale-95 transition-all">
              {t('login')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Leaf size={16} className="text-white" />
              </div>
              <span className="font-black text-lg text-white">AgriFlow ERP</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link to="/market-rates" className="hover:text-white transition-colors">{t('market_rates_nav')}</Link>
              <Link to="/seeds-catalog" className="hover:text-white transition-colors">{t('seeds_catalog_nav')}</Link>
              <Link to="/login" className="hover:text-white transition-colors">{t('farmer_login')}</Link>
            </div>
            <p className="text-gray-500 text-xs">{t('footer_copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
