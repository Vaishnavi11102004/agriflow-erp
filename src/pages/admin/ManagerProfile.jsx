import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api/axios';
import toast from 'react-hot-toast';
import {
  User, Lock, Eye, EyeOff, Shield, Phone, Mail,
  CheckCircle, KeyRound, Edit3, Save, X
} from 'lucide-react';

export default function ManagerProfile() {
  const { t } = useTranslation();
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  // ── Edit Profile ──────────────────────────────────────────────
  const [editMode, setEditMode]     = useState(false);
  const [editName, setEditName]     = useState('');
  const [editEmail, setEditEmail]   = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const startEdit = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditMode(true);
    setEditSuccess(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditSuccess(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return toast.error('Name is required');

    setEditLoading(true);
    try {
      const { data } = await api.patch('/auth/update-profile', {
        name:  editName.trim(),
        email: editEmail.trim() || null,
      });

      // Reflect changes in the auth context so the header / avatar updates
      const updatedUser = { ...user, name: data.user.name, email: data.user.email };
      setUser(updatedUser);
      sessionStorage.setItem('agro_user', JSON.stringify(updatedUser));

      setEditMode(false);
      setEditSuccess(true);
      toast.success('Profile updated! Admin has been notified.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Change Password ───────────────────────────────────────────
  const [oldPwd, setOldPwd]         = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);

  const passwordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels = [
      { score: 1, label: 'Weak',   color: 'bg-red-500' },
      { score: 2, label: 'Fair',   color: 'bg-orange-400' },
      { score: 3, label: 'Good',   color: 'bg-yellow-400' },
      { score: 4, label: 'Strong', color: 'bg-green-500' },
    ];
    return levels[score - 1] || { score: 0, label: '', color: '' };
  };

  const strength = passwordStrength(newPwd);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!oldPwd || !newPwd || !confirmPwd)
      return toast.error('All fields are required');
    if (newPwd.length < 8)
      return toast.error('New password must be at least 8 characters');
    if (newPwd !== confirmPwd)
      return toast.error('New passwords do not match');
    if (newPwd === oldPwd)
      return toast.error('New password must be different from current password');

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        phone:        user.phone,
        old_password: oldPwd,
        new_password: newPwd,
      });
      setSuccess(true);
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
      toast.success('Password changed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header mb-8">
        <div>
          <h1 className="page-title">Profile &amp; Security</h1>
          <p className="page-subtitle">Manage your account details and password</p>
        </div>
      </div>

      {/* ── Account Info Card ──────────────────────────────────── */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <User size={18} className="text-primary-600" /> {t('account_information')}
          </h2>
          {!editMode && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700
                         bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg px-3 py-1.5
                         transition-colors"
            >
              <Edit3 size={13} /> {t('edit', 'Edit Profile')}
            </button>
          )}
        </div>

        {editSuccess && !editMode && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700
                          rounded-xl px-4 py-3 text-sm font-medium">
            <CheckCircle size={16} />
            Profile updated — admin has been notified.
          </div>
        )}

        {/* View mode */}
        {!editMode && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center
                              text-white font-bold text-xl flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-lg leading-tight">{user?.name}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700
                                 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full mt-0.5">
                  <Shield size={11} />
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Manager'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Phone</p>
                  <p className="text-sm font-semibold text-gray-700">{user?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail size={14} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Email</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {user?.email || <span className="text-gray-400 italic font-normal">Not set</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit mode */}
        {editMode && (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your full name"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field pl-10"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Phone number cannot be changed here. Contact a super-admin if needed.
              </p>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Shield size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                Saving changes will notify all super-admins about this profile update.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={editLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {editLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Save size={15} /> Save Changes</>
                )}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold
                           text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-2.5
                           transition-colors"
              >
                <X size={15} /> Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Change Password Card ───────────────────────────────── */}
      <div className="glass-card p-6">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-1">
          <KeyRound size={18} className="text-amber-600" /> {t('change_password')}
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          {t('use_strong_password')}
        </p>

        {success && (
          <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700
                          rounded-xl px-4 py-3 text-sm font-medium">
            <CheckCircle size={16} />
            Password changed successfully!
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {t('current_password')}
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPwd}
                onChange={e => { setOldPwd(e.target.value); setSuccess(false); }}
                placeholder={t('enter_current_password')}
                className="input-field pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowOld(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {t('new_password')}
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setSuccess(false); }}
                placeholder="Min. 8 characters"
                className="input-field pl-10 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength meter */}
            {newPwd && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-[11px] font-semibold ${
                  strength.score <= 1 ? 'text-red-500' :
                  strength.score === 2 ? 'text-orange-500' :
                  strength.score === 3 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {strength.label} password
                </p>
              </div>
            )}
            <ul className="mt-2 space-y-0.5">
              {[
                { check: newPwd.length >= 8,           text: t('at_least_8_chars') },
                { check: /[A-Z]/.test(newPwd),         text: t('one_uppercase_letter') },
                { check: /[0-9]/.test(newPwd),         text: t('one_number') },
                { check: /[^A-Za-z0-9]/.test(newPwd), text: t('one_special_char') },
              ].map(({ check, text }) => (
                <li key={text} className={`text-[11px] flex items-center gap-1.5 ${check ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${check ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {check ? '✓' : '·'}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {t('confirm_new_password_placeholder', 'Confirm New Password')}
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setSuccess(false); }}
                placeholder="Re-enter new password"
                className={`input-field pl-10 pr-10 ${
                  confirmPwd && confirmPwd !== newPwd ? 'border-red-300 bg-red-50' :
                  confirmPwd && confirmPwd === newPwd ? 'border-green-300 bg-green-50' : ''
                }`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPwd && confirmPwd !== newPwd && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                ✗ Passwords do not match
              </p>
            )}
            {confirmPwd && confirmPwd === newPwd && (
              <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                ✓ Passwords match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <><KeyRound size={16} /> Update Password</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
