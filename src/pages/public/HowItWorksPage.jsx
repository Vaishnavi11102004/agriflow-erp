import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Leaf, BadgeCheck, BarChart3, Award, ArrowRight, Menu, X, Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

export default function HowItWorksPage() {
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
              <Link to="/how-it-works" className="text-primary-700 font-semibold border-b-2 border-primary-600 pb-0.5">{t('how_it_works_nav')}</Link>
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
                  <Link to="/login" className="text-gray-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">{t('login')}</Link>
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
            <Link to="/seeds-catalog" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-700">{t('seeds_catalog_nav')}</Link>
            <Link to="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-semibold text-primary-700">{t('how_it_works_nav')}</Link>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-primary-300 font-semibold text-sm mb-3">
            <BadgeCheck size={15} />
            {t('hiw_simple_process')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-3">{t('hiw_hero_title')}</h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">{t('hiw_hero_desc')}</p>
        </div>
      </div>

      {/* CONTENT */}
      <section className="py-20 bg-gray-50">
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
            <Link to="/login"
              className="flex items-center gap-2 bg-primary-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-primary-700 active:scale-95 transition-all shadow-xl shadow-primary-200">
              {t('hiw_start_journey')} <ArrowRight size={20} />
            </Link>
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
