import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Leaf, TrendingUp, BarChart3, ArrowRight, ChevronRight, Menu, X, Globe } from 'lucide-react';
import api from '../../services/api/axios';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

const CROP_COLORS = { Rice: 'from-amber-500 to-yellow-600', Wheat: 'from-yellow-600 to-amber-700', Maize: 'from-orange-400 to-amber-500', Cotton: 'from-sky-400 to-blue-500', default: 'from-teal-400 to-green-500' };
const GRADE_COLOR = { A: 'text-primary-600 bg-primary-50', B: 'text-amber-600 bg-amber-50', C: 'text-orange-600 bg-orange-50' };

export default function MarketRatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLang, setShowLang] = useState(false);

  const { data: marketRates = [], isLoading: loading } = useQuery({
    queryKey: ['public-market-rates'],
    queryFn: async () => {
      const res = await api.get('/public/market-rates');
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

  const EXCLUDED_CROPS = ['soybean', 'jowar', 'abcd'];
  const grouped = marketRates.reduce((acc, r) => {
    if (EXCLUDED_CROPS.some(ex => r.crop_type?.toLowerCase().includes(ex))) return acc;
    if (!acc[r.crop_type]) acc[r.crop_type] = {};
    acc[r.crop_type][r.grade] = parseFloat(r.price_per_kg);
    return acc;
  }, {});
  const cropList = Object.keys(grouped);
  const filteredCrops = activeTab === 'all' ? cropList : cropList.filter(c => c.toLowerCase() === activeTab);

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
              <Link to="/market-rates" className="text-primary-700 font-semibold border-b-2 border-primary-600 pb-0.5">{t('market_rates_nav')}</Link>
              <Link to="/seeds-catalog" className="hover:text-primary-700 transition-colors">{t('seeds_catalog_nav')}</Link>
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
            <Link to="/market-rates" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-semibold text-primary-700">{t('market_rates_nav')}</Link>
            <Link to="/seeds-catalog" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('seeds_catalog_nav')}</Link>
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
          <div className="flex items-center gap-2 text-primary-300 font-semibold text-sm mb-3">
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            {t('mr_live_prices')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-3">{t('mr_hero_title')}</h1>
          <p className="text-white/70 text-lg max-w-xl">{t('mr_hero_desc')}</p>
        </div>
      </div>

      {/* CONTENT */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">{t('mr_grain_price_index')}</h2>
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

          {loading ? (
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
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 justify-items-center">
              {filteredCrops.map(crop => (
                <div key={crop} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden w-full max-w-sm">
                  <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-3 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-center sm:gap-3 text-center sm:text-left">
                    <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${CROP_COLORS[crop] || CROP_COLORS.default} flex items-center justify-center text-white font-black text-sm sm:text-lg shadow-lg flex-shrink-0 mb-1 sm:mb-0`}>{crop[0]}</span>
                    <div>
                      <h3 className="text-white font-bold text-sm sm:text-lg leading-tight">{crop}</h3>
                      <p className="text-white/60 text-[10px] sm:text-xs">{t('mr_price_per_kg')}</p>
                    </div>
                  </div>
                  <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
                    {['A', 'B', 'C'].map(grade => grouped[crop]?.[grade] && (
                      <div key={grade} className="flex flex-col sm:flex-row items-center justify-between p-2 sm:p-3 rounded-xl bg-gray-50 gap-1 sm:gap-0">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${GRADE_COLOR[grade]}`}>{t('grade_label')} {grade}</span>
                          <span className="text-gray-400 text-[10px] sm:text-xs hidden sm:inline">{grade === 'A' ? t('mr_grade_premium') : grade === 'B' ? t('mr_grade_standard') : t('mr_grade_basic')}</span>
                        </div>
                        <span className="text-primary-700 font-black text-sm sm:text-lg">₹{grouped[crop][grade].toFixed(0)}</span>
                      </div>
                    ))}
                    <button onClick={() => handleActionClick('sell')}
                      className="w-full mt-1 sm:mt-2 py-1.5 sm:py-2.5 border-2 border-primary-600 text-primary-700 rounded-xl text-[10px] sm:text-sm font-semibold hover:bg-primary-50 transition-all flex items-center justify-center gap-1">
                      {t('mr_sell_btn')} {crop} <ChevronRight size={12} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <TrendingUp size={40} className="mx-auto mb-4 text-primary-600" />
          <h2 className="text-2xl font-black text-gray-900 mb-3">{t('mr_cta_title')}</h2>
          <p className="text-gray-500 mb-6">{t('mr_cta_desc')}</p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-700 transition-all active:scale-95 shadow-lg shadow-primary-200">
            {t('mr_get_started')} <ArrowRight size={18} />
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
              <p className="text-gray-500 text-xs font-semibold">Powered by VPD Technologies</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
