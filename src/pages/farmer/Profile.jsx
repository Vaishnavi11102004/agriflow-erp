import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import farmerService from '../../services/farmerService';
import storageService from '../../services/storageService';
import { CACHE_TIMES } from '../../lib/queryConfig';
import {
  User, CreditCard, Save, AlertCircle, CheckCircle, Edit3, Sprout,
  FileText, UploadCloud, Link as LinkIcon, IndianRupee, ShoppingBag,
  Calendar, TrendingUp, ArrowRight, MapPin, Bell, History, Wheat
} from 'lucide-react';
import toast from 'react-hot-toast';

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

export default function FarmerProfile() {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState(null);
  const [editPersonal, setEditPersonal] = useState(false);
  const [editBank, setEditBank] = useState(false);
  const [editAgri, setEditAgri] = useState(false);
  const [saving, setSaving] = useState(false);
  const [personalForm, setPersonalForm] = useState({});
  const [bankForm, setBankForm] = useState({});
  const [agriForm, setAgriForm] = useState({});
  const [docForm, setDocForm] = useState({});

  const { data: rawData, isLoading: loading } = useQuery({
    queryKey: ['farmer-profile', user?.id],
    queryFn: () => farmerService.getProfile(user.id),
    enabled: !!user?.id,
    ...CACHE_TIMES.MEDIUM
  });

  const { data: dash } = useQuery({
    queryKey: ['farmer-dashboard', user?.id],
    queryFn: () => farmerService.getDashboard(user.id),
    ...CACHE_TIMES.SHORT,
    enabled: !!user?.id
  });

  useEffect(() => {
    if (rawData) {
      setProfile(rawData.profile);
      setPersonalForm({ name: rawData.user?.name, email: rawData.user?.email, address: rawData.profile?.address, acres_of_land: rawData.profile?.acres_of_land, crop_address: rawData.profile?.crop_address });
      setBankForm({ bank_name: rawData.profile?.bank_name || '', account_number: rawData.profile?.account_number || '', ifsc_code: rawData.profile?.ifsc_code || '', upi_id: rawData.profile?.upi_id || '' });
      setAgriForm({ soil_type: rawData.profile?.soil_type || '', irrigation_type: rawData.profile?.irrigation_type || '', primary_crop: rawData.profile?.primary_crop || '', secondary_crop: rawData.profile?.secondary_crop || '', acres_of_land: rawData.profile?.acres_of_land || '' });
      setDocForm({ aadhaar_card_url: rawData.profile?.aadhaar_card_url || '', bank_passbook_url: rawData.profile?.bank_passbook_url || '', land_ownership_url: rawData.profile?.land_ownership_url || '' });
    }
  }, [rawData]);

  const savePersonal = async () => {
    setSaving(true);
    try {
      const { acres_of_land, ...personalOnly } = personalForm;
      await farmerService.updateProfile(user.id, personalOnly);
      toast.success(t('profile_updated'));
      setEditPersonal(false);
      queryClient.invalidateQueries({ queryKey: ['farmer-profile'] });
      refreshProfile();
    } catch { toast.error(t('update_failed')); }
    finally { setSaving(false); }
  };

  const saveAgri = async () => {
    setSaving(true);
    try {
      const { acres_of_land, ...agriOnly } = agriForm;
      await farmerService.updateProfile(user.id, { ...agriOnly, acres_of_land });
      toast.success(t('agri_details_updated'));
      setEditAgri(false);
      queryClient.invalidateQueries({ queryKey: ['farmer-profile'] });
      refreshProfile();
    } catch { toast.error(t('update_failed')); }
    finally { setSaving(false); }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('File size should be less than 5 MB');
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const { url } = await storageService.uploadBase64(ev.target.result, 'document');
          setDocForm(prev => ({ ...prev, [field]: url }));
          await farmerService.updateProfile(user.id, { [field]: url });
          toast.success('File uploaded successfully');
          queryClient.invalidateQueries({ queryKey: ['farmer-profile'] });
          refreshProfile();
        } catch (err) {
          console.error("Upload Error:", err);
          toast.error('Upload failed');
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Upload failed');
    }
  };



  const requestBankChange = async () => {
    if (!bankForm.bank_name || !bankForm.account_number || !bankForm.ifsc_code) return toast.error(t('fill_bank_fields'));
    setSaving(true);
    try {
      await farmerService.requestBankChange({ ...bankForm, farmer_id: user.id });
      toast.success(t('bank_change_submitted'));
      setEditBank(false);
      queryClient.invalidateQueries({ queryKey: ['farmer-profile'] });
    } catch { toast.error(t('request_failed')); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-8">

      <div>
        <div className="page-header mb-6">
          <div><h1 className="page-title">Account Details</h1><p className="page-subtitle">{t('profile_settings_desc')}</p></div>
        </div>

      {/* Profile Card */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-green">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-500 text-sm">{user?.phone}</p>
            <span className={`badge mt-1 ${user?.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>{user?.status}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Link to="/farmer/transactions" className="btn-secondary btn-sm flex items-center gap-2 flex-1 justify-center">
            <History size={16} /> {t('view_transaction_history')}
          </Link>
          <Link to="/farmer/grain-sales" className="btn-secondary btn-sm flex items-center gap-2 flex-1 justify-center">
            <Wheat size={16} /> {t('grain_sales')}
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><User size={16} />{t('personal_info')}</h3>
          <button onClick={() => setEditPersonal(v => !v)} className="btn-ghost btn-sm flex items-center gap-1">
            <Edit3 size={14} />{editPersonal ? t('cancel') : t('edit')}
          </button>
        </div>

        {editPersonal ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('full_name')}</label><input value={personalForm.name || ''} onChange={e => setPersonalForm(f => ({ ...f, name: e.target.value }))} className="input-field" /></div>
              <div><label className="label">{t('email')}</label><input value={personalForm.email || ''} onChange={e => setPersonalForm(f => ({ ...f, email: e.target.value }))} className="input-field" type="email" /></div>
              <div className="col-span-2"><label className="label">{t('address')}</label><input value={personalForm.address || ''} onChange={e => setPersonalForm(f => ({ ...f, address: e.target.value }))} className="input-field" /></div>

              <div><label className="label">{t('farm_location')}</label><input value={personalForm.crop_address || ''} onChange={e => setPersonalForm(f => ({ ...f, crop_address: e.target.value }))} className="input-field" /></div>
            </div>
            <button onClick={savePersonal} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={16} />{saving ? t('saving') : t('save_changes')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('email'), value: user?.email || t('not_set') },
              { label: t('phone'), value: user?.phone },
              { label: t('address'), value: profile?.address || t('not_set') },
              { label: t('farm_location'), value: profile?.crop_address || t('not_set') },
            ].map(f => (
              <div key={f.label} className="col-span-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{f.label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agricultural Details */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Sprout size={16} />{t('agri_details')}</h3>
          <button onClick={() => setEditAgri(v => !v)} className="btn-ghost btn-sm flex items-center gap-1">
            <Edit3 size={14} />{editAgri ? t('cancel') : t('edit')}
          </button>
        </div>

        {editAgri ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('land_size')}</label><input type="number" value={agriForm.acres_of_land || ''} onChange={e => setAgriForm(f => ({ ...f, acres_of_land: e.target.value }))} className="input-field" step="0.5" /></div>
              <div><label className="label">{t('soil_type')}</label><input value={agriForm.soil_type || ''} onChange={e => setAgriForm(f => ({ ...f, soil_type: e.target.value }))} className="input-field" placeholder={t('soil_type_placeholder')} /></div>
              <div>
                <label className="label">{t('irrigation_type')}</label>
                <select value={agriForm.irrigation_type || ''} onChange={e => setAgriForm(f => ({ ...f, irrigation_type: e.target.value }))} className="input-field">
                  <option value="">{t('select_option')}</option>
                  <option value="Drip">{t('drip')}</option>
                  <option value="Sprinkler">{t('sprinkler')}</option>
                  <option value="Flood">{t('flood')}</option>
                  <option value="Rainfed">{t('rainfed')}</option>
                  <option value="Other">{t('other')}</option>
                </select>
              </div>
              <div><label className="label">{t('primary_crop')}</label><input value={agriForm.primary_crop || ''} onChange={e => setAgriForm(f => ({ ...f, primary_crop: e.target.value }))} className="input-field" placeholder={t('primary_crop_placeholder')} /></div>
              <div className="col-span-2"><label className="label">{t('secondary_crop')}</label><input value={agriForm.secondary_crop || ''} onChange={e => setAgriForm(f => ({ ...f, secondary_crop: e.target.value }))} className="input-field" placeholder={t('secondary_crop_placeholder')} /></div>
            </div>
            <button onClick={saveAgri} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={16} />{saving ? t('saving') : t('save_changes')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('land_size'), value: profile?.acres_of_land ? `${profile.acres_of_land} ${t('acres_lower')}` : t('not_set') },
              { label: t('soil_type'), value: profile?.soil_type || t('not_set') },
              { label: t('irrigation_type'), value: profile?.irrigation_type || t('not_set') },
              { label: t('primary_crop'), value: profile?.primary_crop || t('not_set') },
              { label: t('secondary_crop'), value: profile?.secondary_crop || t('not_set') },
            ].map(f => (
              <div key={f.label} className="col-span-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{f.label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank Details */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><CreditCard size={16} />{t('bank_details')}</h3>
          <button onClick={() => setEditBank(v => !v)} className="btn-ghost btn-sm flex items-center gap-1">
            <Edit3 size={14} />{editBank ? t('cancel') : t('request_change')}
          </button>
        </div>

        {profile?.bank_status === 'pending' && (
          <div className="alert-warning mb-4 text-sm">
            <AlertCircle size={16} />{t('change_request_pending')}
          </div>
        )}

        {editBank ? (
          <div className="space-y-3">
            <div className="alert-warning text-xs"><AlertCircle size={14} />{t('bank_detail_change_warning')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('bank_name')}</label><input value={bankForm.bank_name} onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))} className="input-field" placeholder={t('sbi_placeholder')} /></div>
              <div><label className="label">{t('ifsc_code')}</label><input value={bankForm.ifsc_code} onChange={e => setBankForm(f => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))} className="input-field" placeholder={t('ifsc_placeholder')} /></div>
              <div className="col-span-2"><label className="label">{t('account_number')}</label><input type="text" value={bankForm.account_number} onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value }))} className="input-field" placeholder={t('account_number_placeholder')} /></div>
              <div className="col-span-2"><label className="label">{t('upi_id')}</label><input value={bankForm.upi_id} onChange={e => setBankForm(f => ({ ...f, upi_id: e.target.value }))} className="input-field" placeholder={t('upi_placeholder')} /></div>
            </div>
            <button onClick={requestBankChange} disabled={saving} className="btn-gold flex items-center gap-2">
              <CheckCircle size={16} />{saving ? t('submitting') : t('request_bank_change')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('bank_name'), value: profile?.bank_name || t('not_set') },
              { label: t('ifsc_code'), value: profile?.ifsc_code || t('not_set') },
              { label: t('account_number'), value: profile?.account_number ? '••••••' + profile.account_number.slice(-4) : t('not_set') },
              { label: t('upi_id'), value: profile?.upi_id || t('not_set') },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{f.label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{f.value}</p>
              </div>
            ))}
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{t('approval_status')}</p>
              <span className={`badge mt-1 ${profile?.bank_status === 'approved' ? 'badge-green' : profile?.bank_status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>
                {profile?.bank_status || t('not_set')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Required Documents */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4"><FileText size={16} />{t('required_documents')}</h3>
        <div className="space-y-4">
          {[
            { id: 'aadhaar_card_url', label: t('aadhaar_card'), desc: t('doc_format_desc') },
            { id: 'bank_passbook_url', label: t('bank_passbook'), desc: t('bank_passbook_desc') },
            { id: 'land_ownership_url', label: t('land_ownership'), desc: t('land_ownership_desc') },
          ].map(doc => (
            <div key={doc.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 text-sm">{doc.label}</p>
                <p className="text-xs text-gray-500">{doc.desc}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">PDF / JPG / PNG · Max 5 MB</p>
                {docForm[doc.id] && (
                  <a href={docForm[doc.id]} target="_blank" rel="noreferrer" className="text-xs text-blue-500 flex items-center gap-1 mt-1 hover:underline">
                    <LinkIcon size={12} /> {t('view_uploaded_doc')}
                  </a>
                )}
              </div>
              <div>
                <label className="btn-ghost btn-sm flex items-center gap-1 cursor-pointer">
                  <UploadCloud size={14} /> {docForm[doc.id] ? t('re_upload') : t('upload')}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/png,image/jpeg,image/jpg,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                    onChange={e => handleFileUpload(e, doc.id)}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
