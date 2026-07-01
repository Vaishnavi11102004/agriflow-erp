import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Leaf, Shield, Crown, Eye, EyeOff, Phone, Lock, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import api from '../../services/api/axios';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिंदी' },
];

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  // Force change password state
  const [forceChange, setForceChange] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) return toast.error(t('please_fill_all_fields'));
    setLoading(true);
    try {
      const data = await login(phone, password);
      if (data.requirePasswordChange) {
        setForceChange(true);
        setTempPhone(phone);
        setOldPwd(password);
        toast('Please change your default password to continue.', { icon: '🔐' });
      } else {
        toast.success(`Welcome back, ${data.user.name}!`);
        redirectUser(data.user.role);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
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
      await api.post('/auth/change-password', { phone: tempPhone, old_password: oldPwd, new_password: newPwd });
      toast.success('Password changed! Please login again.');
      setForceChange(false);
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const changeLang = (code) => { i18n.changeLanguage(code); localStorage.setItem('agro_lang', code); };

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
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl backdrop-blur-sm border border-white/20">
            <Leaf className="text-white" size={40} />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 leading-tight">AgriFlow ERP</h1>
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
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <Leaf className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-black text-emerald-700">AgriFlow</h1>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">{t('welcome_back')} 👋</h2>
              <p className="text-gray-500 mt-2">{t('sign_in_desc') || 'Sign in to access your dashboard'}</p>
            </div>



            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="label block text-sm font-medium text-gray-700 mb-1">{t('mobile_number')}</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder={t('mobile_placeholder') || 'Enter mobile number'} 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    maxLength={10} inputMode="numeric" />
                </div>
              </div>
              <div>
                <label className="label block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} 
                    placeholder={t('password_placeholder') || 'Enter password'}
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
              <p className="text-gray-500 text-sm">{t('new_farmer')}{' '}
                <Link to="/register" className="text-emerald-600 font-semibold hover:underline">{t('register')} here</Link>
              </p>
              
              <div className="mt-6 space-y-2">

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-left">
                  <p className="text-blue-800 text-xs font-medium">Demo Manager: phone=8888888888, pwd=Manager@123</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-left">
                  <p className="text-purple-800 text-xs font-medium">Demo Admin: phone=9999999999, pwd=Admin@123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
