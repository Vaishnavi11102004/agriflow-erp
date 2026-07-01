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
const CROP_COLORS = { Rice: 'from-amber-500 to-yellow-600', Wheat: 'from-yellow-600 to-amber-700', Maize: 'from-orange-400 to-amber-500', Cotton: 'from-sky-400 to-blue-500', Soybean: 'from-lime-500 to-green-600', Jowar: 'from-rose-400 to-red-500', default: 'from-teal-400 to-green-500' };
const GRAIN_PHOTOS = {
  Rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
  Wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400',
  Maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=400',
  Cotton: '/cotton-seeds.png',
  Soybean: '/soybean-seeds.png',
  Sugarcane: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&q=80&w=400',
  Groundnut: 'https://images.unsplash.com/photo-1567892737950-30c4db37cd89?auto=format&fit=crop&q=80&w=400',
  default: 'https://images.unsplash.com/photo-1515942400420-2b98fed1f515?auto=format&fit=crop&q=80&w=400'
};

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [seedSearch, setSeedSearch] = useState('');

  const { data: stats = { farmers: 0, crops: 0, seeds: 0, warehouses: 0 } } = useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const res = await api.get('/public/stats');
      return res.data;
    }
  });

  const { data: marketRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['public-market-rates'],
    queryFn: async () => {
      const res = await api.get('/public/market-rates');
      return res.data;
    }
  });

  const { data: seeds = [], isLoading: seedsLoading } = useQuery({
    queryKey: ['public-seeds'],
    queryFn: async () => {
      const res = await api.get('/public/seeds');
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

  // Market rates data processing
  const grouped = marketRates.reduce((acc, r) => {
    if (!acc[r.crop_type]) acc[r.crop_type] = {};
    acc[r.crop_type][r.grade] = parseFloat(r.price_per_kg);
    return acc;
  }, {});
  const cropList = Object.keys(grouped);
  const filteredCrops = activeTab === 'all' ? cropList : cropList.filter(c => c.toLowerCase() === activeTab);

  // Seeds data processing
  const filteredSeeds = seeds.filter(s =>
    s.name?.toLowerCase().includes(seedSearch.toLowerCase()) ||
    s.variety?.toLowerCase().includes(seedSearch.toLowerCase())
  );

  // Features data
  const features = [
    { icon: TrendingUp, titleKey: 'feat1_title', descKey: 'feat1_desc', color: 'bg-primary-100 text-primary-700' },
    { icon: ShoppingBag, titleKey: 'feat2_title', descKey: 'feat2_desc', color: 'bg-amber-100 text-amber-700' },
    { icon: Sprout, titleKey: 'feat3_title', descKey: 'feat3_desc', color: 'bg-green-100 text-green-700' },
    { icon: Warehouse, titleKey: 'feat4_title', descKey: 'feat4_desc', color: 'bg-blue-100 text-blue-700' },
    { icon: Shield, titleKey: 'feat5_title', descKey: 'feat5_desc', color: 'bg-purple-100 text-purple-700' },
    { icon: Clock, titleKey: 'feat6_title', descKey: 'feat6_desc', color: 'bg-rose-100 text-rose-700' },
  ];

  const navLinks = [
    { id: 'market-rates', labelKey: 'market_rates_nav' },
    { id: 'seeds-catalog', labelKey: 'seeds_catalog_nav' },
    { id: 'how-it-works', labelKey: 'how_it_works_nav' },
    { id: 'features', labelKey: 'features_nav' },
  ];

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollTo('hero')}>
              <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-primary-700 rounded-xl flex items-center justify-center shadow">
                <Leaf size={18} className="text-white" />
              </div>
              <span className="text-xl font-black text-primary-800 tracking-tight">AgriFlow ERP</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="hover:text-primary-700 transition-colors"
                >
                  {t(link.labelKey)}
                </button>
              ))}
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
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => { scrollTo(link.id); setMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-sm font-medium text-gray-700 hover:text-primary-700"
              >
                {t(link.labelKey)}
              </button>
            ))}
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
      <section id="hero" className="relative overflow-hidden text-white" style={{ minHeight: '92vh' }}>
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

      {/* ── MARKET RATES SECTION ── */}
      <section id="market-rates" className="scroll-mt-16">
        {/* Banner */}
        <div className="bg-gradient-to-br from-gray-900 to-primary-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-primary-300 font-semibold text-sm mb-3">
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
              {t('mr_live_prices')}
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3">{t('mr_hero_title')}</h2>
            <p className="text-white/70 text-lg max-w-xl">{t('mr_hero_desc')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="py-14 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{t('mr_grain_price_index')}</h3>
                <p className="text-gray-500 mt-1">{t('mr_filter_desc')}</p>
              </div>
              <button onClick={() => handleActionClick('sell')}
                className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all active:scale-95 shadow-md shadow-primary-200 self-start sm:self-auto">
                {t('mr_sell_your_grains')} <ArrowRight size={15} />
              </button>
            </div>

            {/* Crop filter tabs */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {['all', ...cropList.map(c => c.toLowerCase())].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}>
                  {tab === 'all' ? t('mr_all_crops') : tab}
                </button>
              ))}
            </div>

            {ratesLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 justify-items-center">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                    <div className="h-20 bg-gray-200" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCrops.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{t('mr_no_rates')}</p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-5">
                {filteredCrops.map(crop => (
                  <div key={crop} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden w-80">
                    <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-5 py-4 flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${CROP_COLORS[crop] || CROP_COLORS.default} flex items-center justify-center text-white font-black text-lg shadow-lg flex-shrink-0`}>{crop[0]}</span>
                      <div>
                        <h4 className="text-white font-bold text-lg">{crop}</h4>
                        <p className="text-white/60 text-xs">{t('mr_price_per_kg')}</p>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {['A', 'B', 'C'].map(grade => grouped[crop]?.[grade] && (
                        <div key={grade} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${GRADE_COLOR[grade]}`}>{t('grade_label')} {grade}</span>
                            <span className="text-gray-400 text-xs">{grade === 'A' ? t('mr_grade_premium') : grade === 'B' ? t('mr_grade_standard') : t('mr_grade_basic')}</span>
                          </div>
                          <span className="text-primary-700 font-black text-lg">₹{grouped[crop][grade].toFixed(0)}</span>
                        </div>
                      ))}
                      <button onClick={() => handleActionClick('sell')}
                        className="w-full mt-2 py-2.5 border-2 border-primary-600 text-primary-700 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-all flex items-center justify-center gap-1.5">
                        {t('mr_sell_btn')} {crop} <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SEEDS CATALOG SECTION ── */}
      <section id="seeds-catalog" className="scroll-mt-16">
        {/* Banner */}
        <div className="bg-gradient-to-br from-gray-900 to-primary-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm mb-3">
              <Sprout size={15} />
              {t('sc_premium_quality')}
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3">{t('sc_hero_title')}</h2>
            <p className="text-white/80 text-lg max-w-xl">{t('sc_hero_desc')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <input
                type="text"
                placeholder={t('sc_search_placeholder')}
                value={seedSearch}
                onChange={e => setSeedSearch(e.target.value)}
                className="w-full sm:w-80 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
              />
              <button onClick={() => handleActionClick('buy')}
                className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all active:scale-95 shadow-md shadow-amber-200 self-start sm:self-auto">
                {t('sc_browse_buy')} <ArrowRight size={15} />
              </button>
            </div>

            {seedsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                    <div className="h-24 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredSeeds.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                <Sprout size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{seeds.length === 0 ? t('sc_no_seeds') : t('sc_no_match')}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredSeeds.map((seed) => {
                  const cropName = seed.name?.split(' ')[1] || seed.name?.split(' ')[0] || 'default';
                  const photoUrl = GRAIN_PHOTOS[cropName] || GRAIN_PHOTOS.default;
                  return (
                    <div key={seed.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden group">
                      <div className="h-32 bg-gray-100 overflow-hidden relative">
                        <img src={photoUrl} alt={seed.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-primary-700 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                          {t('sc_verified')}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-bold text-gray-900 text-sm leading-tight">{seed.name}</h4>
                          <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full shrink-0">{t('sc_in_stock')}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{seed.variety}</p>
                        <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{seed.description}</p>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-xl font-black text-gray-900">₹{seed.price_per_kg}</span>
                            <span className="text-gray-400 text-xs">/kg</span>
                          </div>
                          <span className="text-xs text-gray-400">{seed.stock_kg} {t('sc_kg_left')}</span>
                        </div>
                        <button onClick={() => handleActionClick('buy')}
                          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold hover:from-amber-600 hover:to-orange-600 transition-all active:scale-95 flex items-center justify-center gap-1.5 group-hover:shadow-md">
                          <ShoppingBag size={13} /> {t('sc_buy_now')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ── */}
      <section id="how-it-works" className="scroll-mt-16">
        {/* Banner */}
        <div className="bg-gradient-to-br from-gray-900 to-primary-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 text-primary-300 font-semibold text-sm mb-3">
              <BadgeCheck size={15} />
              {t('hiw_simple_process')}
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3">{t('hiw_hero_title')}</h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">{t('hiw_hero_desc')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-16">
              {[
                { step: '01', icon: BadgeCheck, titleKey: 'hiw_step1_title', descKey: 'hiw_step1_desc', color: 'from-primary-500 to-green-600' },
                { step: '02', icon: BarChart3, titleKey: 'hiw_step2_title', descKey: 'hiw_step2_desc', color: 'from-amber-500 to-orange-500' },
                { step: '03', icon: Award, titleKey: 'hiw_step3_title', descKey: 'hiw_step3_desc', color: 'from-blue-500 to-cyan-600' },
              ].map((item, index) => (
                <div key={item.step} className={`flex flex-col ${index % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10`}>
                  <div className="flex-1">
                    <div className="relative bg-white rounded-3xl p-10 border border-gray-100 shadow-xl">
                      <div className="text-8xl font-black text-gray-50 absolute -top-6 -right-2 select-none z-0">{item.step}</div>
                      <div className="relative z-10">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg`}>
                          <item.icon size={30} className="text-white" />
                        </div>
                        <h3 className="font-black text-gray-900 text-2xl mb-4">{t(item.titleKey)}</h3>
                        <p className="text-gray-500 text-lg leading-relaxed">{t(item.descKey)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 hidden md:flex justify-center">
                    {index === 0 && (
                      <div className="w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary-600 to-green-600 px-5 py-4">
                          <p className="text-white font-bold text-sm">{t('hiw_card1_title')}</p>
                          <p className="text-white/60 text-xs mt-0.5">{t('hiw_card1_subtitle')}</p>
                        </div>
                        <div className="p-5 space-y-3">
                          {[[t('hiw_card1_name'), 'Rajesh Kumar'], [t('hiw_card1_village'), 'Nalgonda'], [t('hiw_card1_acres'), '12 acres'], [t('hiw_card1_status'), '✅ Approved']].map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                              <span className="text-xs text-gray-400 font-medium">{k}</span>
                              <span className={`text-xs font-bold ${k === t('hiw_card1_status') ? 'text-primary-600' : 'text-gray-700'}`}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="px-5 pb-5">
                          <div className="bg-primary-50 rounded-xl p-3 flex items-center gap-2">
                            <BadgeCheck size={16} className="text-primary-600 flex-shrink-0" />
                            <p className="text-xs text-primary-700 font-medium">{t('hiw_card1_verified')}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center justify-between">
                          <div>
                            <p className="text-white font-bold text-sm">{t('hiw_card2_title')}</p>
                            <p className="text-white/70 text-xs mt-0.5">{t('hiw_card2_subtitle')}</p>
                          </div>
                          <span className="flex items-center gap-1 text-white/80 text-xs font-medium">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />{t('hiw_card2_live')}
                          </span>
                        </div>
                        <div className="p-5 space-y-2">
                          {[['Rice', 'A', '₹48/kg'], ['Wheat', 'A', '₹21/kg'], ['Soybean', 'B', '₹36/kg'], ['Maize', 'A', '₹32/kg']].map(([crop, grade, price]) => (
                            <div key={crop} className="flex justify-between items-center px-3 py-2 rounded-xl bg-amber-50">
                              <span className="text-sm font-semibold text-gray-700">{crop}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{t('hiw_card2_grade')} {grade}</span>
                                <span className="text-sm font-black text-amber-600">{price}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {index === 2 && (
                      <div className="w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-4">
                          <p className="text-white font-bold text-sm">{t('hiw_card3_title')}</p>
                          <p className="text-white/60 text-xs mt-0.5">{t('hiw_card3_subtitle')}</p>
                        </div>
                        <div className="p-5 space-y-3">
                          <div className="flex justify-between text-xs text-gray-500"><span>{t('hiw_card3_grain')}</span><span className="font-bold text-gray-700">Rice (Grade A)</span></div>
                          <div className="flex justify-between text-xs text-gray-500"><span>{t('hiw_card3_qty')}</span><span className="font-bold text-gray-700">500 kg</span></div>
                          <div className="flex justify-between text-xs text-gray-500"><span>{t('hiw_card3_rate')}</span><span className="font-bold text-gray-700">₹48/kg</span></div>
                          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-700">{t('hiw_card3_total')}</span>
                            <span className="text-xl font-black text-primary-600">₹24,000</span>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-2">
                            <Award size={16} className="text-blue-600 flex-shrink-0" />
                            <p className="text-xs text-blue-700 font-medium">{t('hiw_card3_payment')}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-20">
              <Link to="/register"
                className="flex items-center gap-2 bg-primary-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-primary-700 active:scale-95 transition-all shadow-xl shadow-primary-200">
                {t('hiw_start_journey')} <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" className="scroll-mt-16">
        {/* Banner */}
        <div className="bg-gradient-to-br from-gray-900 to-primary-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 text-primary-400 font-semibold text-sm mb-3">
              <Shield size={15} />
              {t('feat_platform')}
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3">{t('feat_hero_title')}</h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">{t('feat_hero_desc')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                  <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <f.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{t(f.titleKey)}</h3>
                  <p className="text-gray-500 leading-relaxed">{t(f.descKey)}</p>
                </div>
              ))}
            </div>

            <div className="mt-20 text-center bg-primary-50 rounded-3xl p-10 border border-primary-100">
              <h2 className="text-2xl font-black text-gray-900 mb-4">{t('feat_cta_title')}</h2>
              <p className="text-primary-800/80 mb-8 max-w-xl mx-auto">{t('feat_cta_desc')}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register"
                  className="flex items-center justify-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-200">
                  {t('feat_create_account')} <ArrowRight size={18} />
                </Link>
              </div>
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
              <button onClick={() => scrollTo('market-rates')} className="hover:text-white transition-colors">{t('market_rates_nav')}</button>
              <button onClick={() => scrollTo('seeds-catalog')} className="hover:text-white transition-colors">{t('seeds_catalog_nav')}</button>
              <Link to="/login" className="hover:text-white transition-colors">{t('farmer_login')}</Link>
            </div>
            <p className="text-gray-500 text-xs">{t('footer_copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
