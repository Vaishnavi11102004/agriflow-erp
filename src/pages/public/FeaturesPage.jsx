import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Leaf, TrendingUp, ShoppingBag, Sprout, Warehouse, Shield, Clock, ArrowRight, Menu, X, Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

export default function FeaturesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLang, setShowLang] = useState(false);

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

  const features = [
    { icon: TrendingUp, titleKey: 'feat1_title', descKey: 'feat1_desc', color: 'bg-primary-100 text-primary-700', border: 'border-primary-200' },
    { icon: ShoppingBag, titleKey: 'feat2_title', descKey: 'feat2_desc', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
    { icon: Sprout, titleKey: 'feat3_title', descKey: 'feat3_desc', color: 'bg-green-100 text-green-700', border: 'border-green-200' },
    { icon: Warehouse, titleKey: 'feat4_title', descKey: 'feat4_desc', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    { icon: Shield, titleKey: 'feat5_title', descKey: 'feat5_desc', color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
    { icon: Clock, titleKey: 'feat6_title', descKey: 'feat6_desc', color: 'bg-rose-100 text-rose-700', border: 'border-rose-200' },
  ];

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
              <Link to="/seeds-catalog" className="hover:text-primary-700 transition-colors">{t('seeds_catalog_nav')}</Link>
              <Link to="/how-it-works" className="hover:text-primary-700 transition-colors">{t('how_it_works_nav')}</Link>
              <Link to="/features" className="text-primary-700 font-semibold border-b-2 border-primary-600 pb-0.5">{t('features_nav')}</Link>
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
                  <Link to="/login" className="text-gray-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">{t('login')}</Link>
                  <Link to="/register" className="flex items-center gap-1.5 bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all active:scale-95 shadow-md shadow-primary-200">
                    {t('register')} <ArrowRight size={15} />
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
            <Link to="/seeds-catalog" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('seeds_catalog_nav')}</Link>
            <Link to="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('how_it_works_nav')}</Link>
            <Link to="/features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-semibold text-primary-700">{t('features_nav')}</Link>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1 text-center py-2.5 border-2 border-primary-600 text-primary-700 rounded-xl text-sm font-semibold">{t('login')}</Link>
              <Link to="/register" className="flex-1 text-center py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold">{t('register')}</Link>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-primary-400 font-semibold text-sm mb-3">
            <Shield size={15} />
            {t('feat_platform')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-3">{t('feat_hero_title')}</h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">{t('feat_hero_desc')}</p>
        </div>
      </div>

      {/* CONTENT */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className={`bg-white p-8 rounded-3xl border border-gray-100 hover:${f.border} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}>
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
            <p className="text-gray-500 text-xs">{t('footer_copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
