import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import managerService from '../../services/managerService';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Eye, Check, X, ChevronRight, User, Plus, UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import validators, { sanitizeMobileInput } from '../../utils/validators';
import FieldError from '../../components/shared/FieldError';

export default function FarmersDirectory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showRegisterModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showRegisterModal]);

  const [regSaving, setRegSaving] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '', phone: '', email: '', password: '', address: '', acres_of_land: '', crop_address: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const validateField = (field, value) => {
    let error = null;
    switch (field) {
      case 'name': error = validators.name(value); break;
      case 'phone': error = validators.phone(value); break;
      case 'email': error = validators.emailRequired(value); break;
      case 'password': error = validators.password(value); break;
      case 'address': error = validators.address(value); break;
      case 'acres_of_land': error = validators.acres(value); break;
      case 'crop_address': error = validators.address(value); break;
      default: break;
    }
    setFieldErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const updateForm = (field, value) => {
    setRegisterForm(f => ({ ...f, [field]: value }));
    if (fieldErrors[field]) validateField(field, value);
  };

  // Mobile number validates live (every keystroke/paste), not just on blur —
  // sanitized so non-digits can never enter the field in the first place.
  const handlePhoneChange = (e) => {
    const clean = sanitizeMobileInput(e.target.value);
    setRegisterForm(f => ({ ...f, phone: clean }));
    validateField('phone', clean);
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const clean = sanitizeMobileInput(e.clipboardData.getData('text'));
    setRegisterForm(f => ({ ...f, phone: clean }));
    validateField('phone', clean);
  };

  const { data: farmers = [], isLoading: loading } = useQuery({
    queryKey: ['admin-farmers'],
    queryFn: () => adminService.getFarmers()
  });

  const loadDetail = async (id) => {
    setDetailLoading(true);
    const data = await adminService.getFarmerDetails(id);
    setDetail(data); setDetailLoading(false);
  };

  const handleAction = async (id, status) => {
    try {
      await managerService.approveFarmer(id, status, null, user?.id);
      toast.success(t('farmer') + ' ' + status);
      queryClient.invalidateQueries({ queryKey: ['admin-farmers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      if (selected === id) setDetail(d => ({ ...d, farmer: { ...d.farmer, status } }));
    } catch { toast.error(t('action_failed')); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this farmer? This cannot be undone.')) return;
    try {
      await adminService.deleteFarmer(id, user?.id, user?.name);
      toast.success('Farmer deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-farmers'] });
      if (selected === id) { setSelected(null); setDetail(null); }
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  };

  const handleRegisterFarmer = async (e) => {
    e.preventDefault();
    
    // Validate on form submission
    const nameErr = validateField('name', registerForm.name);
    const phoneErr = validateField('phone', registerForm.phone);
    const emailErr = validateField('email', registerForm.email);
    const passErr = validateField('password', registerForm.password);
    const addrErr = validateField('address', registerForm.address);
    const acresErr = validateField('acres_of_land', registerForm.acres_of_land);
    const cropAddrErr = validateField('crop_address', registerForm.crop_address);

    if (nameErr || phoneErr || emailErr || passErr || addrErr || acresErr || cropAddrErr) {
      return; // Stop submission if errors
    }
    
    setRegSaving(true);
    try {
      const payload = { ...registerForm };
      if (!payload.address) delete payload.address;
      if (!payload.crop_address) delete payload.crop_address;
      
      const parsedAcres = parseFloat(payload.acres_of_land);
      payload.acres_of_land = parsedAcres;

      await adminService.createFarmer(payload);
      toast.success('Farmer registered successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-farmers'] });
      setShowRegisterModal(false);
      setRegisterForm({ name: '', phone: '', email: '', password: '', address: '', acres_of_land: '', crop_address: '' });
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally { setRegSaving(false); }
  };

  const filtered = farmers.filter(f => {
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.phone.includes(search);
    return matchStatus && matchSearch;
  });

  const statusBadge = (s) => ({ active: 'badge-green', pending: 'badge-yellow', rejected: 'badge-red' }[s] || 'badge-gray');

  return (
    <div className="animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div><h1 className="page-title">{t('farmers')}</h1><p className="page-subtitle">{t("manage_farmers_desc")}</p></div>
        {isSuperAdmin && (
          <button onClick={() => setShowRegisterModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Register Farmer
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_by_name_phone")} className="input-field pl-10" />
        </div>
        <div className="tab-nav mb-0 flex-shrink-0">
          {['all', 'pending', 'active', 'rejected'].map(s => (
            <button key={s} className={`tab-btn capitalize ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{t(s)}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Table */}
        <div className={`glass-card overflow-hidden flex-1 ${selected ? 'hidden xl:block' : ''}`}>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
              : filtered.length === 0 ? <p className="text-center py-10 text-gray-400 text-sm">{t('no_farmers_found')}</p>
              : filtered.map(f => (
                <div key={f.id} className="p-4 flex justify-between items-center cursor-pointer" onClick={() => { setSelected(f.id); loadDetail(f.id); }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">{f.name?.[0]}</div>
                    <div>
                      <p className="font-semibold text-gray-800">{f.name}</p>
                      <p className="text-xs text-gray-500">{f.phone}</p>
                    </div>
                  </div>
                  <span className={`badge ${statusBadge(f.status)}`}>{t(f.status)}</span>
                </div>
              ))
            }
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block table-container">
            <table className="data-table">
              <thead><tr>
                <th>{t("farmer")}</th><th>{t("phone")}</th><th>{t("address")}</th><th>{t("acres")}</th><th>{t("status")}</th><th>{t("registered")}</th><th>{t("actions")}</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></td></tr>
                  : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">{t("no_farmers_found")}</td></tr>
                    : filtered.map(f => (
                      <tr key={f.id} className={`cursor-pointer ${selected === f.id ? 'bg-primary-50' : ''}`} onClick={() => { setSelected(f.id); loadDetail(f.id); }}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">{f.name?.[0]}</div>
                            <span className="font-semibold text-gray-800">{f.name}</span>
                          </div>
                        </td>
                        <td>{f.phone}</td>
                        <td className="text-xs max-w-[120px] truncate">{f.address || '-'}</td>
                        <td>{f.acres_of_land || '-'}</td>
                        <td><span className={`badge ${statusBadge(f.status)}`}>{t(f.status)}</span></td>
                        <td className="text-xs">
                          {(() => {
                            const raw = f.status === 'active' ? (f.verified_at || f.created_at) : f.created_at;
                            const d = new Date(raw);
                            return isNaN(d) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                          })()}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {f.status === 'pending' && (
                              <>
                                <button onClick={e => { e.stopPropagation(); handleAction(f.id, 'active'); }}
                                  className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title={t('approve')}>
                                  <Check size={14} />
                                </button>
                                <button onClick={e => { e.stopPropagation(); handleAction(f.id, 'rejected'); }}
                                  className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors" title={t('reject')}>
                                  <X size={14} />
                                </button>
                              </>
                            )}
                            <button onClick={e => { e.stopPropagation(); setSelected(f.id); loadDetail(f.id); }} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"><Eye size={14} /></button>
                            {isSuperAdmin && <button onClick={e => handleDelete(f.id, e)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Delete farmer"><Trash2 size={14} /></button>}
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-full xl:w-80 flex-shrink-0">
            <div className="glass-card p-5 sticky top-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">{t("farmer_details")}</h3>
                <button onClick={() => { setSelected(null); setDetail(null); }} className="btn-icon"><X size={16} /></button>
              </div>
              {detailLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
                : detail && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                        {detail.farmer.name?.[0]}
                      </div>
                      <h4 className="font-bold text-gray-900">{detail.farmer.name}</h4>
                      <p className="text-gray-500 text-sm">{detail.farmer.phone}</p>
                      {detail.farmer.email && <p className="text-gray-400 text-xs">{detail.farmer.email}</p>}
                      <span className={`badge ${statusBadge(detail.farmer.status)} mt-1`}>{t(detail.farmer.status)}</span>
                    </div>
                    {detail.farmer.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(detail.farmer.id, 'active')} className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1"><Check size={14} />{t("approve")}</button>
                        <button onClick={() => handleAction(detail.farmer.id, 'rejected')} className="btn-danger flex-1 py-2 text-xs flex items-center justify-center gap-1"><X size={14} />{t("reject")}</button>
                      </div>
                    )}
                    {isSuperAdmin && (
                      <button onClick={e => handleDelete(detail.farmer.id, e)} className="w-full mt-1 py-2 text-xs rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center gap-1 transition-colors">
                        <Trash2 size={13} /> Delete Farmer
                      </button>
                    )}
                    <div className="space-y-2 text-sm">
                      {[
                        [t('email') || 'Email', detail.farmer.email],
                        [t('address'), detail.farmer.address],
                        [t('acres'), detail.farmer.acres_of_land],
                        [t('farm_location'), detail.farmer.crop_address],
                        [t('bank_status'), detail.farmer.bank_status],
                        ['Registered On', detail.farmer.created_at ? new Date(detail.farmer.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null],
                      ].map(([k, v]) => v && (
                        <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                          <span className="text-gray-400 text-xs">{k}</span>
                          <span className="text-gray-700 text-xs font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="bg-primary-50 rounded-xl p-2"><p className="text-lg font-bold text-primary-700">{detail.crops?.length || 0}</p><p className="text-[10px] text-gray-500">{t("crops")}</p></div>
                      <div className="bg-green-50 rounded-xl p-2"><p className="text-lg font-bold text-green-700">{detail.transactions?.length || 0}</p><p className="text-[10px] text-gray-500">{t("txns")}</p></div>
                      <div className="bg-amber-50 rounded-xl p-2"><p className="text-lg font-bold text-amber-700">{detail.grainSales?.length || 0}</p><p className="text-[10px] text-gray-500">{t("sales")}</p></div>
                    </div>
                    {detail.transactions?.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <h5 className="text-xs font-bold text-gray-700 mb-2">{t("past_transactions")}</h5>
                        <div className="max-h-48 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                          {detail.transactions.map(tx => (
                            <div key={tx.id} className="bg-gray-50 p-2 rounded-lg flex justify-between items-center">
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="text-[11px] text-gray-800 font-medium truncate">{tx.description}</p>
                                <p className="text-[9px] text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-IN')}</p>
                              </div>
                              <span className={`text-xs font-bold whitespace-nowrap ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                                {tx.direction === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          </div>
        )}
      </div>

      {/* Register Farmer Modal */}
      {showRegisterModal && (
        <div className="modal-overlay items-start pt-4 sm:items-center sm:pt-0">
          <div className="modal-content max-w-lg w-full mx-3 max-h-[90vh] overflow-y-auto">
            <div className="modal-header">
              <h3 className="modal-title">Register New Farmer</h3>
              <button onClick={() => setShowRegisterModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleRegisterFarmer} noValidate>
              <div className="modal-body space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input value={registerForm.name} onChange={e => updateForm('name', e.target.value)} onBlur={() => validateField('name', registerForm.name)} className={`input-field ${fieldErrors.name ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="Farmer full name" required />
                  <FieldError error={fieldErrors.name} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="reg-farmer-phone">Phone (10 digits) *</label>
                    <input
                      id="reg-farmer-phone"
                      value={registerForm.phone}
                      onChange={handlePhoneChange}
                      onPaste={handlePhonePaste}
                      onBlur={() => validateField('phone', registerForm.phone)}
                      className={`input-field ${fieldErrors.phone ? 'border-red-400 ring-1 ring-red-200' : ''}`}
                      placeholder="9876543210"
                      maxLength={10}
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                      aria-invalid={!!fieldErrors.phone}
                      aria-describedby={fieldErrors.phone ? 'reg-farmer-phone-error' : undefined}
                    />
                    <FieldError error={fieldErrors.phone} id="reg-farmer-phone-error" />
                  </div>
                  <div>
                    <label className="label">Email Address *</label>
                    <input type="email" value={registerForm.email} onChange={e => updateForm('email', e.target.value)} onBlur={() => validateField('email', registerForm.email)} className={`input-field ${fieldErrors.email ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="farmer@example.com" required />
                    <FieldError error={fieldErrors.email} />
                  </div>
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input type="password" value={registerForm.password} onChange={e => updateForm('password', e.target.value)} onBlur={() => validateField('password', registerForm.password)} className={`input-field ${fieldErrors.password ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="Min. 8 characters" required />
                  <FieldError error={fieldErrors.password} />
                </div>
                <div>
                  <label className="label">Address *</label>
                  <input value={registerForm.address} onChange={e => updateForm('address', e.target.value)} onBlur={() => validateField('address', registerForm.address)} className={`input-field ${fieldErrors.address ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="Village / Town" />
                  <FieldError error={fieldErrors.address} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Acres of Land *</label>
                    <input type="number" value={registerForm.acres_of_land} onChange={e => updateForm('acres_of_land', e.target.value)} onBlur={() => validateField('acres_of_land', registerForm.acres_of_land)} className={`input-field ${fieldErrors.acres_of_land ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="e.g. 5" />
                    <FieldError error={fieldErrors.acres_of_land} />
                  </div>
                  <div>
                    <label className="label">Crop Address *</label>
                    <input value={registerForm.crop_address} onChange={e => updateForm('crop_address', e.target.value)} onBlur={() => validateField('crop_address', registerForm.crop_address)} className={`input-field ${fieldErrors.crop_address ? 'border-red-400 ring-1 ring-red-200' : ''}`} placeholder="Farm location" />
                    <FieldError error={fieldErrors.crop_address} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setRegisterForm({ name: '', phone: '', password: '', address: '', acres_of_land: '', crop_address: '' }); setFieldErrors({}); setShowRegisterModal(false); }} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={regSaving} className="btn-primary flex items-center gap-2">
                  {regSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={16} />}
                  {regSaving ? 'Registering...' : 'Register Farmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
