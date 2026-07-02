import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Leaf, ShoppingBag, Sprout, ArrowRight, Menu, X, Globe } from 'lucide-react';
import api from '../../services/api/axios';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

const CROP_ICONS = { Rice: '🌾', Wheat: '🌿', Maize: '🌽', Cotton: '🌸', Soybean: '🫘', default: '🌱' };
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

export default function SeedsCatalogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [search, setSearch] = useState('');

  const { data: seeds = [], isLoading: loading } = useQuery({
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

  const filtered = seeds.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.variety?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-primary-700 rounded-xl flex items-center justify-center shadow">
                <Leaf size={18} className="text-white" />
              </div>
              <span className="text-xl font-black text-primary-800 tracking-tight">AgriFlow ERP</span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link to="/market-rates" className="hover:text-primary-700 transition-colors">{t('market_rates_nav')}</Link>
              <Link to="/seeds-catalog" className="text-primary-700 font-semibold border-b-2 border-primary-600 pb-0.5">{t('seeds_catalog_nav')}</Link>
              <Link to="/how-it-works" className="hover:text-primary-700 transition-colors">{t('how_it_works_nav')}</Link>
              <Link to="/features" className="hover:text-primary-700 transition-colors">{t('features_nav')}</Link>
            </div>

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
                  <Link to="/login" className="flex items-center gap-1.5 bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all active:scale-95 shadow-md shadow-primary-200">
                    {t('login')} <ArrowRight size={15} />
                  </Link>
                </>
              )}
            </div>

            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(v => !v)}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <Link to="/market-rates" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('market_rates_nav')}</Link>
            <Link to="/seeds-catalog" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-semibold text-primary-700">{t('seeds_catalog_nav')}</Link>
            <Link to="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('how_it_works_nav')}</Link>
            <Link to="/features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('features_nav')}</Link>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1 text-center py-2.5 border-2 border-primary-600 text-primary-700 rounded-xl text-sm font-semibold">{t('login')}</Link>
              <Link to="/login" className="flex-1 text-center py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold">{t('login')}</Link>
            </div>
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

      {/* HERO BANNER */}
      <div className="bg-gradient-to-br from-gray-900 to-primary-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm mb-3">
            <Sprout size={15} />
            {t('sc_premium_quality')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-3">{t('sc_hero_title')}</h1>
          <p className="text-white/80 text-lg max-w-xl">{t('sc_hero_desc')}</p>
        </div>
      </div>

      {/* CONTENT */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            {/* Search */}
            <input
              type="text"
              placeholder={t('sc_search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-80 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            />
            <button onClick={() => handleActionClick('buy')}
              className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all active:scale-95 shadow-md shadow-amber-200 self-start sm:self-auto">
              {t('sc_browse_buy')} <ArrowRight size={15} />
            </button>
          </div>

          {loading ? (
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Sprout size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{seeds.length === 0 ? t('sc_no_seeds') : t('sc_no_match')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((seed) => {
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
                      <h3 className="font-bold text-gray-900 text-sm leading-tight">{seed.name}</h3>
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
      </section>

      {/* CTA */}
      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <ShoppingBag size={40} className="mx-auto mb-4 text-amber-500" />
          <h2 className="text-2xl font-black text-gray-900 mb-3">{t('sc_cta_title')}</h2>
          <p className="text-gray-500 mb-6">{t('sc_cta_desc')}</p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-amber-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-200">
            {t('sc_get_started')} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
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
              <Link to="/market-rates" className="hover:text-white transition-colors">{t('footer_market_rates')}</Link>
              <Link to="/seeds-catalog" className="hover:text-white transition-colors">{t('footer_seeds')}</Link>
              <Link to="/login" className="hover:text-white transition-colors">{t('footer_farmer_login')}</Link>

            </div>
            <div className="flex flex-col md:items-end gap-1">
              <p className="text-gray-500 text-xs">{t('footer_copyright')}</p>
              <p className="text-gray-500 text-xs font-semibold">powered by VPD Technologies</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
