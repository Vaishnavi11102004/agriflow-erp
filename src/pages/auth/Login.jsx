import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Leaf, Shield, Crown, Eye, EyeOff, Phone, Lock, ArrowRight, ArrowLeft, AlertTriangle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import validators from '../../utils/validators';
import FieldError from '../../components/shared/FieldError';
import { BRAND_NAME } from '../../utils/brandLogo';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिंदी' },
];

const DEMO_ACCOUNTS = [
  { label: 'Demo Super Admin', email: 'superadmin@agroseq.com', password: 'Admin@123', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
  { label: 'Demo Manager', email: 'manager@agroseq.com', password: 'Manager@123', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  { label: 'Demo Farmer', email: 'farmer@agroseq.com', password: 'Farmer@123', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
];

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validateField = (field, value) => {
    let error = null;
    if (field === 'email') error = validators.emailRequired(value);
    if (field === 'password') error = value ? null : 'Password is required';
    if (field === 'newPwd') error = validators.password(value);
    if (field === 'confirmPwd') error = value && value !== newPwd ? 'Passwords do not match' : null;
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  // Force change password state
  const [forceChange, setForceChange] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error(t('please_fill_all_fields'));
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.requirePasswordChange) {
        setForceChange(true);
        setTempPhone(data.user.phone);
        setOldPwd(password);
        toast('Please change your default password to continue.', { icon: '🔐' });
      } else {
        toast.success(`Welcome back, ${data.user.name}!`);
        redirectUser(data.user.role);
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const redirectUser = (userRole) => {
    if (userRole === 'super_admin') return navigate('/admin/dashboard');
    if (userRole === 'manager') return navigate('/manager/dashboard');
    
    if (location.state?.from === 'buy') {
      return navigate('/farmer/seeds');
    } else if (location.state?.from === 'sell') {
      return navigate('/farmer/booking-slots');
    }
    
    navigate('/farmer');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) return toast.error(t('passwords_do_not_match'));
    if (newPwd.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await authService.changePassword(tempPhone, oldPwd, newPwd);
      toast.success('Password changed! Please login again.');
      setForceChange(false);
      setPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const changeLang = (code) => { i18n.changeLanguage(code); localStorage.setItem('agro_lang', code); };

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setFieldErrors({});
  };

  if (forceChange) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950">
      <div className="w-full max-w-md animate-fade-in">
        <div className="glass-card p-8 border-t-4 border-t-yellow-500 bg-white shadow-xl rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-yellow-600" size={20} />
            </div>
            <div>
              <h2 className="text-gray-900 font-bold">Change Password Required</h2>
              <p className="text-gray-500 text-xs">You must set a new password before continuing</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Min. 8 characters" className="input-field" />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password" className="input-field" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-all">
              {loading ? 'Changing...' : 'Set New Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Left — decorative */}
      <div className="hidden lg:flex lg:w-1/2 auth-gradient flex-col items-center justify-center p-12 relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-900">
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-white/20 overflow-hidden">
            <img src="/logo-icon.jpeg" alt={BRAND_NAME} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 leading-tight">{BRAND_NAME}</h1>
          <p className="text-white/80 text-xl mb-10">{t('agricultural_partner')}</p>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {[
              { icon: '🌾', title: 'Crop Tracking', desc: '4-month cycle monitoring' },
              { icon: '💰', title: 'Grain Sales', desc: 'Grade-based pricing' },
              { icon: '🌱', title: 'Seed Purchase', desc: 'Premium seed varieties' },
              { icon: '📊', title: 'Market Rates', desc: 'Real-time price updates' },
            ].map(f => (
              <div key={f.title} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-left border border-white/10 hover:bg-white/20 transition-all">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-white/60 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-gray-50">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-emerald-700 transition-colors">
            <ArrowLeft size={15} /> {t('back_to_home')}
          </Link>
          <div className="flex gap-2">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => changeLang(l.code)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${i18n.language === l.code ? 'bg-primary-100 text-primary-700 font-bold' : 'text-gray-500 hover:bg-gray-200'}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md animate-fade-in bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-gray-200">
                <img src="/logo-icon.jpeg" alt={BRAND_NAME} className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-black text-emerald-700">{BRAND_NAME}</h1>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">{t('welcome_back')} 👋</h2>
              <p className="text-gray-500 mt-2">{t('sign_in_desc') || 'Sign in to access your dashboard'}</p>
            </div>



            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="label block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onBlur={() => validateField('email', email)}
                    placeholder="Enter email address" 
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border ${fieldErrors.email ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} />
                </div>
                <FieldError error={fieldErrors.email} />
              </div>
              <div>
                <label className="label block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onBlur={() => validateField('password', password)}
                    placeholder={t('password_placeholder') || 'Enter password'}
                    className={`w-full pl-10 pr-10 py-3 bg-gray-50 border ${fieldErrors.password ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldError error={fieldErrors.password} />
              </div>

              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-gray-600">{t('remember_me')}</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-emerald-600 hover:underline font-medium">{t('forgot_password')}</Link>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/20 mt-6">
                {loading ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="mt-6 text-center">
              <div className="mt-2 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Demo Credentials</p>
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    type="button"
                    key={acc.email}
                    onClick={() => fillDemo(acc)}
                    className={`w-full p-3 ${acc.bg} border ${acc.border} rounded-xl text-left hover:brightness-95 transition-all`}
                  >
                    <p className={`text-xs font-bold ${acc.text}`}>{acc.label}</p>
                    <p className={`text-xs ${acc.text}`}>email={acc.email}, pwd={acc.password}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
