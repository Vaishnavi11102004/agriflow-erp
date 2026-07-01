import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { Sprout, Plus, X, CheckCircle, Clock, Leaf, Calendar, Tractor } from 'lucide-react';
import toast from 'react-hot-toast';

const CROP_TYPES = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Soybean', 'Groundnut', 'Sugarcane', 'Turmeric', 'Chili', 'Other'];

function CropCycleTracker({ sowingDate }) {
  const { t } = useTranslation();
  const sowing = new Date(sowingDate);
  const now = new Date();
  const monthsElapsed = Math.min(4, Math.floor((now - sowing) / (1000 * 60 * 60 * 24 * 30)));
  const months = [
    { label: t('sowing'), desc: t('verification_visit'), emoji: '🌱' },
    { label: t('growing'), desc: t('active_growth'), emoji: '🌿' },
    { label: t('maturity'), desc: t('progress_visit'), emoji: '🌾' },
    { label: t('harvest'), desc: t('ready_to_sell'), emoji: '✅' },
  ];
  return (
    <div className="flex items-start gap-1 mt-3">
      {months.map((m, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold
              ${i < monthsElapsed ? 'bg-primary-500 border-primary-500 text-white' :
                i === monthsElapsed ? 'bg-amber-400 border-amber-400 text-white' :
                'bg-gray-100 border-gray-300 text-gray-400'}`}>
              {i < monthsElapsed ? '✓' : i + 1}
            </div>
            <p className="text-[10px] font-medium text-gray-600 text-center">{m.label}</p>
          </div>
          {i < 3 && <div className={`h-0.5 flex-shrink-0 w-4 ${i < monthsElapsed ? 'bg-primary-400' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function CropManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ crop_type: 'Rice', acres: '', sowing_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const { data: crops = [], isLoading: cropsLoading } = useQuery({
    queryKey: ['farmer-crops'],
    queryFn: async () => { const res = await api.get('/farmer/crops'); return res.data; }
  });

  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['farmer-visits'],
    queryFn: async () => { const res = await api.get('/farmer/visits'); return res.data; }
  });

  const loading = cropsLoading || visitsLoading;

  const addCrop = async (e) => {
    e.preventDefault();
    if (!form.acres || parseFloat(form.acres) <= 0) return toast.error(t('enter_valid_acreage'));
    setSaving(true);
    try {
      await api.post('/farmer/crops', { ...form, acres: parseFloat(form.acres) });
      toast.success(t('crop_registered_success'));
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['farmer-crops'] });
    } catch (err) { toast.error(err.response?.data?.error || t('failed_to_register_crop')); }
    finally { setSaving(false); }
  };

  const getVisitsForCrop = (cropId) => visits.filter(v => v.crop_id === cropId);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('crops_cycles')}</h1>
          <p className="page-subtitle">{t('crop_management_desc')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />{t('add_crop')}
        </button>
      </div>

      {crops.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-lg font-semibold text-gray-700">{t('no_crops_yet')}</h3>
          <p className="text-gray-400 text-sm mt-2 mb-6">{t('register_first_crop')}</p>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 mx-auto">{t('register_crop')}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {crops.map(crop => {
            const cropVisits = getVisitsForCrop(crop.id);
            return (
              <div key={crop.id} className="glass-card p-5 hover-lift">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-2xl">🌾</div>
                    <div>
                      <h3 className="font-bold text-gray-800">{crop.crop_type}</h3>
                      <p className="text-xs text-gray-500">{crop.acres} {t('acres_lower')}</p>
                    </div>
                  </div>
                  <span className={`badge ${crop.status === 'growing' ? 'badge-green' : crop.status === 'harvested' ? 'badge-blue' : 'badge-gray'}`}>
                    {crop.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Calendar size={12} /><span>{t('sowed')}: {crop.sowing_date}</span>
                </div>

                <CropCycleTracker sowingDate={crop.sowing_date} />

                {/* Visits */}
                {cropVisits.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">{t('farm_visits')}</p>
                    {cropVisits.map(v => (
                      <div key={v.id} className="flex items-center gap-2 text-xs mb-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                          ${v.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {v.status === 'completed' ? '✓' : '!'}
                        </div>
                        <span className="text-gray-600">{t('month_visit', { month: v.visit_month })}</span>
                        <span className={`ml-auto badge ${v.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>{v.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {crop.notes && <p className="text-xs text-gray-500 mt-3 italic">{crop.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Crop Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center"><Sprout size={20} className="text-primary-600" /></div>
                <div><h3 className="font-bold text-gray-800">{t('register_crop')}</h3><p className="text-xs text-gray-500">{t('fill_crop_details')}</p></div>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={addCrop} className="modal-body space-y-4">
              <div>
                <label className="label">{t('crop_type')} *</label>
                <select value={form.crop_type} onChange={e => setForm(f => ({ ...f, crop_type: e.target.value }))} className="input-field">
                  {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('acres')} *</label>
                <input type="number" value={form.acres} onChange={e => setForm(f => ({ ...f, acres: e.target.value }))}
                  className="input-field" placeholder={t('acres_placeholder')} step="0.5" min="0.5" required />
              </div>
              <div>
                <label className="label">{t('sowing_date')} *</label>
                <input type="date" value={form.sowing_date} onChange={e => setForm(f => ({ ...f, sowing_date: e.target.value }))}
                  className="input-field" required />
              </div>
              <div className="alert-info text-xs">
                {t('farm_visits_auto_scheduled')}
              </div>
            </form>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={addCrop} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {saving ? t('registering') : t('register_crop')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
