import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { Calendar, Plus, X, CheckCircle, Warehouse, AlertTriangle, Eye, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const GRAIN_TYPES = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Groundnut', 'Sugarcane'];

export default function BookingSlot() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    grain_sale_id: '', warehouse_id: '', grain_type: '', quantity_kg: '',
    booking_date: '',
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['farmer-booking-slots'],
    queryFn: async () => { const res = await api.get('/farmer/booking-slots'); return res.data; }
  });
  const { data: warehouses = [], isLoading: whLoading } = useQuery({
    queryKey: ['farmer-warehouses'],
    queryFn: async () => { const res = await api.get('/farmer/warehouses'); return res.data; }
  });
  const loading = slotsLoading || whLoading;

  const selectedWarehouse = warehouses.find(w => w.id === parseInt(form.warehouse_id));
  const available_kg = selectedWarehouse ? selectedWarehouse.available_kg : null;
  const capacityWarning = form.quantity_kg && available_kg !== null && parseFloat(form.quantity_kg) > available_kg;

  const handleBook = async (e) => {
    e.preventDefault();
    if (capacityWarning) return toast.error(t('insufficient_capacity', { capacity: (available_kg / 1000).toFixed(1) }));
    if (!form.booking_date || !form.warehouse_id || !form.quantity_kg) return toast.error(t('fill_required'));
    setSaving(true);
    try {
      await api.post('/farmer/booking-slot', {
        booking_date: form.booking_date,
        booking_date: form.booking_date,
        grain_type: form.grain_type,
        warehouse_id: parseInt(form.warehouse_id),
        quantity_kg: parseFloat(form.quantity_kg)
      });
      toast.success(t('booking_created'));
      setShowModal(false); 
      queryClient.invalidateQueries({ queryKey: ['farmer-booking-slots'] });
    } catch (err) { toast.error(err.response?.data?.error || t('booking_failed')); }
    finally { setSaving(false); }
  };

  const statusBadge = (s) => ({ pending: 'badge-yellow', confirmed: 'badge-green', completed: 'badge-blue', cancelled: 'badge-red' }[s] || 'badge-gray');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('booking_slot')}</h1><p className="page-subtitle">{t('booking_slot_desc')}</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} />{t('book_slot')}</button>
      </div>

      {/* Warehouse Capacity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {warehouses.map(w => {
          const pct = (w.current_load_kg / w.total_capacity_kg) * 100;
          return (
            <div key={w.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{w.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{w.address}</p>
                </div>
                <Warehouse size={20} className="text-primary-500" />
              </div>
              <div className="warehouse-bar mb-2">
                <div className={`${pct > 80 ? 'warehouse-fill-red' : pct > 60 ? 'warehouse-fill-yellow' : 'warehouse-fill-green'}`}
                  style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t('used_colon')} {(w.current_load_kg / 1000).toFixed(0)}T</span>
                <span className="font-semibold text-primary-700">{t('available_colon')} {(w.available_kg / 1000).toFixed(0)}T</span>
                <span>{t('total_colon')} {(w.total_capacity_kg / 1000).toFixed(0)}T</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking History */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-gray-100"><h3 className="font-semibold">{t('my_booking_slots')}</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr>
              <th>{t('date')}</th><th>{t('grain_type')}</th><th>{t('quantity')}</th><th>{t('warehouse')}</th><th>{t('status')}</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {slots.length === 0
                ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">{t('no_slots_booked_yet')}</td></tr>
                : slots.map(s => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.booking_date}</td>
                    <td>{s.grain_type}</td>
                    <td>{s.quantity_kg} kg</td>
                    <td><p className="font-medium">{s.warehouse_name}</p></td>

                    <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                    <td>
                      <button onClick={() => setSelectedSlot(s)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:text-primary-600 hover:bg-primary-50" title="Details"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><Calendar size={20} className="text-purple-600" /></div>
                <div><h3 className="font-bold text-gray-800">{t('book_slot')}</h3><p className="text-xs text-gray-500">{t('schedule_grain_delivery')}</p></div>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleBook} className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('grain_type')} *</label>
                  <select value={form.grain_type} onChange={e => setForm(f => ({ ...f, grain_type: e.target.value }))} className="input-field" required>
                    <option value="" disabled>Select Grain</option>
                    {GRAIN_TYPES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t('booking_date')} *</label>
                  <input type="date" value={form.booking_date} onChange={e => setForm(f => ({ ...f, booking_date: e.target.value }))}
                    className="input-field" min={new Date().toISOString().split('T')[0]} required />
                </div>
              </div>
              <div>
                <label className="label">{t('warehouse')} *</label>
                <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} className="input-field" required>
                  <option value="" disabled>{t('select_warehouse')}</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{t('warehouse_available', { name: w.name, capacity: (w.available_kg / 1000).toFixed(0) })}</option>)}
                </select>
              </div>

              {form.warehouse_id && (
                <div>
                  <label className="label">{t('quantity_kg')} *</label>
                  <input type="number" value={form.quantity_kg} onChange={e => setForm(f => ({ ...f, quantity_kg: e.target.value }))}
                    className={`input-field peer ${capacityWarning ? 'input-error' : ''}`} placeholder={t('quantity_in_kg')} min="1" max={available_kg} required />
                  {capacityWarning && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} />{t('exceeds_capacity', { capacity: (available_kg / 1000).toFixed(1) })}
                    </p>
                  )}
                  {!capacityWarning && (
                    <p className="mt-1 text-xs text-red-500 hidden peer-invalid:[&:not(:placeholder-shown)]:block">
                      Invalid quantity (max {(available_kg || 0).toLocaleString()} kg)
                    </p>
                  )}
                </div>
              )}

            </form>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleBook} disabled={saving || capacityWarning} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {saving ? t('booking') : t('confirm_booking')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSlot && (
        <div className="modal-overlay" onClick={() => setSelectedSlot(null)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-gray-800 text-lg">{t('booking_details')}</h3>
              <button onClick={() => setSelectedSlot(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 uppercase">{t('booking_id_upper')}</p><p className="font-medium">#{selectedSlot.id}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('date_upper')}</p><p className="font-medium">{selectedSlot.booking_date}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('grain_type_upper')}</p><p className="font-medium">{selectedSlot.grain_type}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('quantity_upper')}</p><p className="font-medium text-green-600">{selectedSlot.quantity_kg} kg</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('warehouse_upper')}</p><p className="font-medium">{selectedSlot.warehouse_name}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('status_upper')}</p><span className={`badge ${statusBadge(selectedSlot.status)}`}>{selectedSlot.status}</span></div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
