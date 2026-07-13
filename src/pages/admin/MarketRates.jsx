import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import marketService from '../../services/marketService';
import { CACHE_TIMES } from '../../lib/queryConfig';
import { TrendingUp, Plus, X, CheckCircle, Edit, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CROP_TYPES = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Groundnut', 'Sugarcane'];
const GRADES = ['A', 'B', 'C'];

export default function MarketRates() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ id: null, crop_type: 'Rice', grade: 'A', price_per_kg: '' });
  const [bulkPrices, setBulkPrices] = useState({ A: '', B: '', C: '' });

  const { data: rates = [], isLoading: loading } = useQuery({
    queryKey: ['admin-market-rates'],
    queryFn: () => marketService.getRates(),
    ...CACHE_TIMES.LONG
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rate?')) return;
    try {
      await marketService.deleteRate(id);
      toast.success('Rate deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-market-rates'] });
    } catch { toast.error(t('action_failed')); }
  };

  const openAdd = () => { setForm({ id: null, crop_type: 'Rice', grade: 'A', price_per_kg: '' }); setBulkPrices({ A: '', B: '', C: '' }); setShowModal(true); };
  const openEdit = (r) => { setForm({ ...r }); setShowModal(true); };

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.id) {
        await marketService.updateRate(form.id, { price_per_kg: parseFloat(form.price_per_kg), effective_date: today });
        toast.success(t('rate_updated'));
      } else {
        const entries = GRADES.filter(g => bulkPrices[g] !== '');
        if (!entries.length) { toast.error('Enter at least one grade price'); setSaving(false); return; }
        await Promise.all(entries.map(g =>
          marketService.setRate({ crop_type: form.crop_type, grade: g, price_per_kg: parseFloat(bulkPrices[g]), effective_date: today }, user?.id)
        ));
        toast.success(t('rate_added'));
      }
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin-market-rates'] });
    } catch { toast.error(t('save_failed')); }
    finally { setSaving(false); }
  };

  const filtered = rates.filter(r => r.crop_type.toLowerCase().includes(search.toLowerCase()));
  const grouped = filtered.reduce((acc, r) => { (acc[r.crop_type] = acc[r.crop_type] || []).push(r); return acc; }, {});

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('market_rates')}</h1><p className="page-subtitle">{t("manage_rates_desc")}</p></div>
        {user?.role === 'super_admin' && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={16} />{t("set_rate")}</button>
        )}
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_crop_type")} className="input-field pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? <div className="col-span-full flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
          : Object.keys(grouped).length === 0 ? <p className="col-span-full text-center py-10 text-gray-400">{t("no_rates_configured")}</p>
            : Object.entries(grouped).map(([crop, cropRates]) => (
              <div key={crop} className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-primary-50 to-white border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-lg">🌾</div>
                  <h3 className="font-bold text-gray-800 text-lg">{crop}</h3>
                </div>
                <div className="p-4 space-y-3">
                  {cropRates.sort((a, b) => a.grade.localeCompare(b.grade)).map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`badge ${r.grade === 'A' ? 'badge-green' : r.grade === 'B' ? 'badge-yellow' : 'badge-gray'}`}>{t('grade')} {r.grade}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-800">₹{r.price_per_kg}<span className="text-xs text-gray-500 font-normal">/kg</span></span>
                        {user?.role === 'super_admin' && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded bg-white border border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-200 shadow-sm transition-all"><Edit size={14} /></button>
                            <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 shadow-sm transition-all"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        }
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center"><TrendingUp size={20} className="text-primary-600" /></div>
                <div><h3 className="font-bold text-gray-800">{form.id ? t('edit_rate') : t('set_new_rate')}</h3></div>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form id="market-rate-form" onSubmit={handleSubmit} className="modal-body space-y-4">
              <div>
                <label className="label">{t("crop_type")} *</label>
                <select value={form.crop_type} onChange={e => setForm(f => ({ ...f, crop_type: e.target.value }))} className="input-field" disabled={!!form.id}>
                  {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {form.id ? (
                <div>
                  <label className="label">{t("price_per_kg")} ({t('grade')} {form.grade}) *</label>
                  <input type="number" value={form.price_per_kg} onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} className="input-field" step="0.5" min="0.5" required />
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="label">{t("price_per_kg")} *</label>
                  {GRADES.map(g => (
                    <div key={g} className="flex items-center gap-3">
                      <span className={`w-16 text-center text-xs font-bold px-2 py-1 rounded-full ${g === 'A' ? 'bg-green-100 text-green-700' : g === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{t('grade')} {g}</span>
                      <input type="number" value={bulkPrices[g]} onChange={e => setBulkPrices(p => ({ ...p, [g]: e.target.value }))} placeholder={`₹ per kg`} className="input-field flex-1" step="0.5" min="0.5" />
                    </div>
                  ))}
                </div>
              )}
            </form>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t("cancel")}</button>
              <button type="submit" form="market-rate-form" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}{saving ? t('saving') : t('save_rate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
