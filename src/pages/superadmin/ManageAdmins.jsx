import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { Shield, Plus, X, CheckCircle, Search, Edit2, Ban, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import validators from '../../utils/validators';
import FieldError from '../../components/shared/FieldError';

export default function ManageAdmins() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ id: null, name: '', phone: '', email: '', password: '', status: 'active' });
  const [fieldErrors, setFieldErrors] = useState({});

  const validateField = (field, value) => {
    let error = null;
    switch (field) {
      case 'name': error = validators.name(value); break;
      case 'phone':
        if (!value) error = 'Phone Number is required.';
        else if (!/^\d+$/.test(value)) error = 'Phone Number must contain only digits.';
        else if (value.length !== 10) error = 'Phone Number must contain exactly 10 digits.';
        else error = null;
        break;
      case 'email': error = validators.email(value); break;
      case 'password': 
        if (!form.id && !value) error = 'Password is required';
        else if (value) error = validators.password(value);
        break;
      default: break;
    }
    setFieldErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const updateForm = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (fieldErrors[field]) validateField(field, value);
  };

  const { data: managers = [], isLoading: loading } = useQuery({
    queryKey: ['superadmin-managers'],
    queryFn: async () => {
      const res = await api.get('/admin/managers');
      return res.data;
    }
  });

  const openAdd = () => { setForm({ id: null, name: '', phone: '', email: '', password: '', status: 'active' }); setFieldErrors({}); setShowModal(true); };
  const openEdit = (m) => { setForm({ ...m, password: '' }); setFieldErrors({}); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const nameErr = validateField('name', form.name);
    const phoneErr = validateField('phone', form.phone);
    const emailErr = validateField('email', form.email);
    let passErr = null;
    if (!form.id || form.password) passErr = validateField('password', form.password);
    
    if (nameErr || phoneErr || emailErr || passErr) return;
    
    setSaving(true);
    try {
      if (form.id) await api.patch(`/admin/managers/${form.id}`, form);
      else await api.post('/admin/managers', form);
      toast.success(form.id ? 'Manager updated' : 'Manager added');
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-managers'] });
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (m) => {
    const newStatus = m.status === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/admin/managers/${m.id}`, { status: newStatus });
      toast.success(`Manager ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['superadmin-managers'] });
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  const filtered = managers.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search));

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-3xl font-bold text-gray-900">{t("manage_admins")}</h1><p className="text-gray-500 mt-1">{t("manage_admins_desc")}</p></div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={18} />{t("new_manager")}</button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_managers")} className="input-field pl-11 py-3" />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("name")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("phone")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("email")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("status")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("created")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={6} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">{t("no_managers_found")}</td></tr>
                  : filtered.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-semibold text-gray-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600"><Shield size={14} /></div>
                        {m.name}
                      </td>
                      <td className="p-4 text-gray-600">{m.phone}</td>
                      <td className="p-4 text-gray-600">{m.email || '-'}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${m.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{m.status}</span></td>
                      <td className="p-4 text-gray-400 text-sm">{new Date(m.created_at * 1000).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleToggleStatus(m)} className={`p-2 rounded-lg transition-colors ${m.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'}`} title={m.status === 'active' ? 'Deactivate' : 'Activate'}>
                            {m.status === 'active' ? <Ban size={16} /> : <Play size={16} />}
                          </button>
                          <button onClick={() => openEdit(m)} className="p-2 bg-gray-100 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-200 transition-colors"><Edit2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Shield size={18} className="text-primary-600" />{form.id ? t('edit_manager') : t('new_manager')}</h3>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-4" noValidate>
              <div>
                <label className="label">{t("full_name")} *</label>
                <input value={form.name} onChange={e => updateForm('name', e.target.value)} onBlur={() => validateField('name', form.name)} className={`input-field ${fieldErrors.name ? 'border-red-400 ring-1 ring-red-200' : ''}`} required />
                <FieldError error={fieldErrors.name} />
              </div>
              <div>
                <label className="label">{t("phone_login_id")} *</label>
                <input value={form.phone} onChange={e => updateForm('phone', e.target.value)} onBlur={() => validateField('phone', form.phone)} className={`input-field ${fieldErrors.phone ? 'border-red-400 ring-1 ring-red-200' : ''}`} required maxLength={10} />
                <FieldError error={fieldErrors.phone} />
              </div>
              <div>
                <label className="label">{t("email")}</label>
                <input type="email" value={form.email || ''} onChange={e => updateForm('email', e.target.value)} onBlur={() => validateField('email', form.email)} className={`input-field ${fieldErrors.email ? 'border-red-400 ring-1 ring-red-200' : ''}`} />
                <FieldError error={fieldErrors.email} />
              </div>
              <div>
                <label className="label">{form.id ? t('reset_password') : t('password') + ' *'}</label>
                <input type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} onBlur={() => validateField('password', form.password)} className={`input-field ${fieldErrors.password ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder={form.id ? "Leave blank to keep current" : "Required"} required={!form.id} />
                <FieldError error={fieldErrors.password} />
              </div>
              {form.id && (
                <div><label className="label">{t("status")}</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field"><option value="active">{t("active")}</option><option value="suspended">Suspended (Inactive)</option></select></div>
              )}
              {(!form.id) && <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mt-4"><p className="text-blue-600 text-xs flex items-center gap-1.5">{t('new_manager_password_note')}</p></div>}
              <div className="modal-footer mt-4">
                <button type="submit" disabled={saving} className="btn-primary w-full flex justify-center items-center gap-2">
                  {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={18} />}{saving ? t('saving') : t('save_manager')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
