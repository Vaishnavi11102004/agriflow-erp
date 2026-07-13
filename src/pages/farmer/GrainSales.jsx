import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import farmerService from '../../services/farmerService';
import { useAuth } from '../../context/AuthContext';
import { CACHE_TIMES } from '../../lib/queryConfig';
import { Wheat, Plus, X, CheckCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const GRAIN_TYPES = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Groundnut', 'Sugarcane'];
const GRADES = ['A', 'B', 'C'];

export default function GrainSales() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    grain_type: 'Rice', quantity_kg: '', warehouse_id: ''
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['farmer-grain-sales', user?.id],
    queryFn: () => farmerService.getGrainSales(user.id),
    enabled: !!user?.id,
    ...CACHE_TIMES.SHORT
  });
  const { data: allCrops = [], isLoading: cropsLoading } = useQuery({
    queryKey: ['farmer-crops', user?.id],
    queryFn: () => farmerService.getCrops(user.id),
    enabled: !!user?.id,
    ...CACHE_TIMES.SHORT
  });
  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['farmer-market-rates'],
    queryFn: () => farmerService.getMarketRates(),
    ...CACHE_TIMES.LONG
  });
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ['farmer-warehouses'],
    queryFn: () => farmerService.getWarehouses(),
    ...CACHE_TIMES.LONG
  });

  const crops = allCrops.filter(c => c.status === 'growing' || c.status === 'harvested');
  const loading = salesLoading || cropsLoading || ratesLoading || warehousesLoading;

  const getRate = (grain, grade) => rates.find(r => r.crop_type === grain && r.grade === grade)?.price_per_kg || 0;
  const estimated = form.good_material_kg ? (parseFloat(form.good_material_kg) * getRate(form.grain_type, form.grade)).toFixed(2) : '0.00';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantity_kg) return toast.error(t('enter_valid_quantity'));
    setSaving(true);
    try {
      await farmerService.submitGrainSale(user.id, {
        grain_type: form.grain_type,
        quantity_kg: parseFloat(form.quantity_kg),
        warehouse_id: form.warehouse_id,
      });
      toast.success(t('grain_sale_submitted'));
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['farmer-grain-sales'] });
    } catch (err) { toast.error(err.message || t('submission_failed')); }
    finally { setSaving(false); }
  };

  const statusBadge = (s) => ({ pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', paid: 'badge-blue' }[s] || 'badge-gray');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('grain_sales')}</h1><p className="page-subtitle">{t('grain_sales_desc')}</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} />{t('new_sale')}</button>
      </div>

      {/* Market Rates Quick View */}
      <div className="glass-card p-5 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Info size={16} className="text-blue-500" />{t('todays_market_rates')}</h3>
        <div className="flex flex-wrap gap-3">
          {[...new Set(rates.map(r => r.crop_type))].slice(0, 5).map(ct => {
            const gradeA = rates.find(r => r.crop_type === ct && r.grade === 'A');
            return (
              <div key={ct} className="flex items-center gap-2 bg-primary-50 px-3 py-2 rounded-xl">
                <span className="text-sm font-medium text-gray-700">{ct}</span>
                <span className="badge-green text-[11px]">A: ₹{gradeA?.price_per_kg}/kg</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{t('my_grain_sales')}</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr>
              <th>{t('grain_type')}</th><th>{t('quantity')} (kg)</th><th>{t('status')}</th><th>{t('date')}</th>
            </tr></thead>
            <tbody>
              {sales.length === 0
                ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">{t('no_grain_sales_yet')}</td></tr>
                : sales.map(s => (
                  <tr key={s.id}>
                    <td><p className="font-semibold">{s.grain_type}</p></td>
                    <td>{s.raw_material_kg} kg</td>
                    <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                    <td className="text-xs">{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sale Modal */}
      {showModal && (
        <div className="modal-overlay items-start pt-4 sm:items-center sm:pt-0" onClick={() => setShowModal(false)}>
          <div className="modal-content w-full mx-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Wheat size={20} className="text-amber-600" /></div>
                <div><h3 className="font-bold text-gray-800">{t('submit_grain_sale')}</h3><p className="text-xs text-gray-500">{t('manager_assign_slot_desc')}</p></div>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-4">
              <div>
                <label className="label">{t('grain_type')} *</label>
                <select value={form.grain_type} onChange={e => setForm(f => ({ ...f, grain_type: e.target.value }))} className="input-field">
                  {GRAIN_TYPES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('warehouse')} *</label>
                <select value={form.warehouse_id || ''} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} className="input-field" required>
                  <option value="">{t('select_warehouse')}</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('quantity')} (kg) *</label>
                <input type="number" value={form.quantity_kg || ''} onChange={e => setForm(f => ({ ...f, quantity_kg: e.target.value }))}
                  className="input-field" placeholder="0" min="1" step="0.1" required />
              </div>
            </form>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleSubmit} disabled={saving} className="btn-gold flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {saving ? t('submitting') : t('submit_sale_request')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
