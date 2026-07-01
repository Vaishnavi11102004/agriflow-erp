import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api/axios';
import { Leaf, Phone, Lock, User, MapPin, Sprout, CheckCircle, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';


export default function Register() {
  const { t } = useTranslation();
  const STEPS = [t('personal_info'), t('verify_otp_step'), t('farm_details')];
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    let interval;
    if (timer > 0 && step === 1) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, step]);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '', confirmPwd: '',
    otp: '', address: '', acres_of_land: '', crop_address: ''
  });
  const [pwdStrength, setPwdStrength] = useState(0);

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'password') {
      let s = 0;
      if (v.length >= 8) s++;
      if (/[A-Z]/.test(v)) s++;
      if (/[0-9]/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      setPwdStrength(s);
    }
  };

  const sendOTP = async () => {
    if (form.password !== form.confirmPwd) return toast.error(t('passwords_do_not_match'));
    if (!/^\d{10}$/.test(form.phone)) return toast.error(t('enter_valid_phone'));
    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone: form.phone });
      setOtpSent(true);
      toast.success(`OTP sent! (Demo OTP: ${data.otp})`);
      setStep(1);
      setTimer(60);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!form.otp || form.otp.length !== 6) return toast.error(t('enter_6_digit_otp'));
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { phone: form.phone, otp: form.otp });
      toast.success('OTP Verified!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.address || !form.acres_of_land) return toast.error(t('fill_all_details'));
    if (form.password !== form.confirmPwd) return toast.error(t('passwords_do_not_match'));
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: form.name, phone: form.phone, email: form.email,
        password: form.password, otp: form.otp,
        address: form.address, acres_of_land: parseFloat(form.acres_of_land),
        crop_address: form.crop_address
      });
      toast.success('Registration submitted! Admin will approve your account.');
      navigate('/login');
        } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
        const fieldErrors = err.response.data.details.map(d => `${d.field}: ${d.message}`).join(', ');
        toast.error(`Validation failed: ${fieldErrors}`);
      } else {
        toast.error(err.response?.data?.error || 'Registration failed');
      }
    }

    finally { setLoading(false); }
  };

  const strengthColor = ['bg-gray-200', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];

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
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-lg animate-fade-in bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-agro-green rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Leaf className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('create_farmer_account')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('join_agriflow')}</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8 px-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i < step ? 'bg-primary-500 text-white' : i === step ? 'bg-agro-green text-white ring-4 ring-primary-100' : 'bg-gray-200 text-gray-400'}`}>
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              <div className="ml-2 mr-3 hidden sm:block">
                <p className={`text-xs font-semibold ${i === step ? 'text-agro-green' : 'text-gray-400'}`}>{s}</p>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mr-4 ${i < step ? 'bg-primary-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><User size={18} className="text-primary-600" />{t('personal_info')}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">{t('full_name')}</label>
                  <input value={form.name} onChange={e => update('name', e.target.value)} className="input-field" placeholder={t('your_full_name')} />
                </div>
                <div className="col-span-2">
                  <label className="label">{t('mobile_number')} *</label>
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field" placeholder={t('mobile_placeholder')} maxLength={10} />
                </div>
                <div className="col-span-2">
                  <label className="label">{t('email_optional')}</label>
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field" placeholder={t('your_email')} />
                </div>
                <div>
                  <label className="label">{t('password')} *</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} className="input-field pr-10" placeholder={t('min_8_chars')} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">{[1,2,3,4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= pwdStrength ? strengthColor[pwdStrength] : 'bg-gray-200'}`} />)}</div>
                      <p className={`text-xs mt-1 ${pwdStrength >= 3 ? 'text-green-600' : 'text-orange-500'}`}>{strengthLabel[pwdStrength]}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">{t('confirm_password')}</label>
                  <input type="password" value={form.confirmPwd} onChange={e => update('confirmPwd', e.target.value)} className={`input-field ${form.confirmPwd && form.confirmPwd !== form.password ? 'input-error' : ''}`} placeholder={t('repeat_password')} />
                </div>
              </div>
              <button onClick={sendOTP} disabled={loading || !form.name || !form.phone || !form.password || form.password !== form.confirmPwd}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {t('send_otp')} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 1: OTP */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><Phone size={18} className="text-primary-600" />{t('verify_otp')}</h2>
              <div className="alert-info text-sm">{t('otp_sent')} <strong>{form.phone}</strong></div>
              <div>
                <label className="label">{t('enter_6_digit_otp')}</label>
                <input type="text" value={form.otp} onChange={e => update('otp', e.target.value.replace(/\D/, ''))}
                  className="input-field text-center text-2xl tracking-widest font-bold" maxLength={6} placeholder="------" />
              </div>
              <button onClick={verifyOtp} className="btn-primary w-full py-3">Verify OTP <ArrowRight size={16} className="inline ml-1" /></button>
              
              <div className="text-center text-sm">
                {timer > 0 ? (
                  <p className="text-gray-500">{t('resend_otp_in')} <span className="font-semibold text-agro-green">00:{timer.toString().padStart(2, '0')}</span></p>
                ) : (
                  <p className="text-gray-500">
                    Didn't receive code?{' '}
                    <button onClick={sendOTP} className="text-agro-green font-semibold hover:underline cursor-pointer" disabled={loading}>
                      Resend OTP
                    </button>
                  </p>
                )}
              </div>

              <button onClick={() => setStep(0)} className="btn-ghost w-full"><ArrowLeft size={16} className="inline mr-1" />Back</button>
            </div>
          )}

          {/* Step 2: Farm Details */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Sprout size={18} className="text-primary-600" />{t('farm_details')}</h2>
              <div>
                <label className="label">{t('address')} *</label>
                <input value={form.address} onChange={e => update('address', e.target.value)} className="input-field" placeholder={t('home_address_placeholder')} />
              </div>
              <div>
                <label className="label">{t('acres_of_land')} *</label>
                <input type="number" value={form.acres_of_land} onChange={e => update('acres_of_land', e.target.value)} className="input-field" placeholder={t('eg_5_5')} step="0.5" min="0.1" />
              </div>
              <div>
                <label className="label">{t('crop_address')} *</label>
                <input value={form.crop_address} onChange={e => update('crop_address', e.target.value)} className="input-field" placeholder={t('crop_address_placeholder')} />
              </div>
              <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">{t('registration_review_msg')}</p>
              <button onClick={handleRegister} disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={18} />}
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
              <button onClick={() => setStep(1)} className="btn-ghost w-full"><ArrowLeft size={16} className="inline mr-1" />Back</button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          {t('already_have_account')}{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">{t('login_here')}</Link>
        </p>
          </div>
        </div>
      </div>
    </div>
  );
}
