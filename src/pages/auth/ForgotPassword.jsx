import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { Leaf, Mail, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import validators from '../../utils/validators';
import FieldError from '../../components/shared/FieldError';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState(null);

  const validateEmail = (val) => {
    const error = validators.emailRequired(val);
    setEmailError(error);
    return !error;
  };

  const handleSendReset = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      await authService.resetPassword(email);
      setSent(true);
      toast.success('Reset email sent successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen agro-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-agro-green rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Leaf className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reset_password')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('recover_access_desc') || 'Recover access to your account'}</p>
        </div>

        <div className="glass-card p-8 space-y-5">
          {!sent ? (
            <form onSubmit={handleSendReset} className="space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Mail size={18} className="text-primary-600" />
                Enter Email Address
              </h2>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  onBlur={() => validateEmail(email)}
                  className={`input-field ${emailError ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                  placeholder="Enter your email address"
                />
                <FieldError error={emailError} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Send Reset Link <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle size={24} />
              </div>
              <h3 className="font-bold text-gray-900">Reset Link Sent</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                We have sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions to set a new password.
              </p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full py-3">
                Back to Login
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-primary-600 hover:underline font-medium">
            <ArrowLeft size={14} className="inline mr-1" />
            {t('back_to_login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
