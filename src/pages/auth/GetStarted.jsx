import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Leaf, LogIn, PhoneCall, ArrowLeft, ArrowRight, MessageCircle, Mail, MapPin } from 'lucide-react';

export default function GetStarted() {
  const { t } = useTranslation();
  const location = useLocation();
  const fromAction = location.state?.from;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 sm:p-6">
        <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-emerald-700 transition-colors">
          <ArrowLeft size={15} /> {t('back_to_home', 'Back to Home')}
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Logo & Heading */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
              <Leaf className="text-white" size={30} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">
              {t('get_started_title', 'Welcome to AgriFlow')}
            </h1>
            <p className="text-gray-500 text-base sm:text-lg max-w-md mx-auto">
              {t('get_started_subtitle', 'How would you like to proceed?')}
            </p>
          </div>

          {/* Two Option Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">

            {/* Option 1 — Already have credentials */}
            <Link
              to="/login"
              state={fromAction ? { from: fromAction } : undefined}
              className="group relative bg-white rounded-2xl border-2 border-gray-100 p-6 sm:p-8 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-500 group-hover:scale-110 transition-all duration-300">
                <LogIn size={24} className="text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('already_have_credentials', 'I Have Credentials')}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">
                {t('already_have_credentials_desc', 'Already registered? Sign in with your mobile number and password to access your dashboard.')}
              </p>
              <span className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm group-hover:gap-3 transition-all">
                {t('sign_in_now', 'Sign In Now')} <ArrowRight size={16} />
              </span>
            </Link>

            {/* Option 2 — Need credentials / Contact team */}
            <div className="relative bg-white rounded-2xl border-2 border-gray-100 p-6 sm:p-8 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
                <PhoneCall size={24} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('need_credentials', 'New to AgriFlow?')}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">
                {t('need_credentials_desc', 'Get in touch with our team to register your farm and receive your login credentials.')}
              </p>

              {/* Contact methods */}
              <div className="w-full space-y-2.5">
                <a
                  href="tel:+919876543210"
                  className="flex items-center gap-3 w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-left"
                >
                  <PhoneCall size={16} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t('call_us', 'Call Us')}</p>
                    <p className="text-xs text-gray-500">+91 98765 43210</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 w-full px-4 py-3 bg-amber-50 rounded-xl border border-amber-100 text-left">
                  <MapPin size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t('visit_us', 'Visit Us')}</p>
                    <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
                      {t('office_address', 'AgriFlow Office, Beside Rythu Bazaar, Main Road, Andhra Pradesh — 522001')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
