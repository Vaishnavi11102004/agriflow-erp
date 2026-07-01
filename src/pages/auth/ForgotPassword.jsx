import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api/axios';
import { Leaf, Phone, ArrowLeft, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=phone, 1=otp, 2=new pw
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (!/^\d{10}$/.test(phone)) return toast.error(t('enter_valid_phone'));
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password/send-otp', { phone });
      toast.success(`OTP sent! (Demo: ${data.otp})`);
      setStep(1);
    } catch (err) { toast.error(err.response?.data?.error || 'Phone not registered'); }
    finally { setLoading(false); }
  };

  const verifyOtp = () => {
    if (otp.length !== 6) return toast.error(t('enter_6_digit_otp'));
    setStep(2);
  };

  const resetPwd = async () => {
    if (newPwd !== confirmPwd) return toast.error(t('passwords_do_not_match'));
    if (newPwd.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/reset', { phone, otp, new_password: newPwd });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.error || 'Reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen agro-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-agro-green rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Leaf className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reset_password')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('recover_access_desc')}</p>
        </div>

        <div className="glass-card p-8 space-y-5">
          {step === 0 && (
            <>
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Phone size={18} />{t('enter_mobile_number')}</h2>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/, ''))}
                className="input-field" placeholder={t('mobile_placeholder')} maxLength={10} />
              <button onClick={sendOTP} disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Send Reset OTP <ArrowRight size={16} />
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="font-semibold text-gray-800">{t('enter_otp_sent_to')} {phone}</h2>
              <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ''))}
                className="input-field text-center text-2xl tracking-widest font-bold" maxLength={6} placeholder="------" />
              <button onClick={verifyOtp} className="btn-primary w-full py-3">Verify OTP <ArrowRight size={16} className="inline ml-1" /></button>
              <button onClick={() => setStep(0)} className="btn-ghost w-full"><ArrowLeft size={16} className="inline mr-1" />Back</button>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Lock size={18} />{t('set_new_password')}</h2>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="input-field" placeholder={t('new_password_placeholder')} />
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className={`input-field ${confirmPwd && confirmPwd !== newPwd ? 'input-error' : ''}`} placeholder={t('confirm_new_password_placeholder')} />
              <button onClick={resetPwd} disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={18} />}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </>
          )}
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-primary-600 hover:underline font-medium"><ArrowLeft size={14} className="inline" /> {t('back_to_login')}</Link>
        </p>
      </div>
    </div>
  );
}
