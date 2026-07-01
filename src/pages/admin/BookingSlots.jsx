import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api/axios';
import {
  Calendar, Search, CheckCircle, X, MapPin, Eye,
  DollarSign, ClipboardList, Truck, AlertTriangle,
  ThumbsUp, ThumbsDown, FlaskConical, Edit, Edit2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const REJECTION_REASONS = [
  'Moisture Damage',
  'Pest Damage',
  'Rotten Produce',
  'Physical Damage',
  'Foreign Material Contamination',
  'Other',
];

const STATUS_META = {
  pending:                { key: 'pending',               badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  confirmed:              { key: 'confirmed',              badge: 'bg-blue-100 text-blue-700 border border-blue-200' },
  delivered:              { key: 'delivered', badge: 'bg-orange-100 text-orange-700 border border-orange-200' },
  'Inspection Completed': { key: 'inspection_completed',   badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  completed:              { key: 'completed',              badge: 'bg-purple-100 text-purple-700 border border-purple-200' },
  cancelled:              { key: 'cancelled',              badge: 'bg-red-100 text-red-600 border border-red-200' },
};

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const meta = STATUS_META[status] || { key: status, badge: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.badge}`}>
      {t(meta.key)}
    </span>
  );
}

export default function BookingSlots() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState('all');
  const [selectedSlot, setSelectedSlot]   = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [inspectSlot, setInspectSlot]   = useState(null);
  const [inspectForm, setInspectForm]   = useState({ good_quantity_kg: '', bad_quantity_kg: '', rejection_reason: '', notes: '' });
  const [inspectSaving, setInspectSaving] = useState(false);

  // Edit Yield modal
  const [editYieldSlot, setEditYieldSlot] = useState(null);
  const [editYieldForm, setEditYieldForm] = useState({ good_quantity_kg: '', bad_quantity_kg: '' });
  const [editSaving, setEditSaving] = useState(false);

  const { data: slots = [], isLoading: loading } = useQuery({
    queryKey: ['admin-booking-slots'],
    queryFn: async () => { const res = await api.get('/admin/booking-slots'); return res.data; },
  });

  const [assignSlotModal, setAssignSlotModal] = useState(null);
  const [selectedWarehouseSlotId, setSelectedWarehouseSlotId] = useState('');

  const { data: availableSlots = [], isLoading: slotsLoadingStatus } = useQuery({
    queryKey: ['admin-warehouse-slots', assignSlotModal?.warehouse_id, assignSlotModal?.booking_date],
    queryFn: async () => {
      const res = await api.get(`/admin/warehouse-slots?warehouse_id=${assignSlotModal.warehouse_id}&date=${assignSlotModal.booking_date}`);
      return res.data;
    },
    enabled: !!assignSlotModal
  });

  const handleAction = async (id, status, warehouse_slot_id = null) => {
    setActionLoading(id + status);
    try {
      await api.patch(`/admin/booking-slots/${id}`, { status, warehouse_slot_id });
      toast.success(t('slot_marked_as', { status: t(STATUS_META[status]?.key || status) }));
      queryClient.invalidateQueries({ queryKey: ['admin-booking-slots'] });
      if (status === 'confirmed') setAssignSlotModal(null);
    } catch (err) { toast.error(err.response?.data?.error || t('action_failed')); }
    finally { setActionLoading(null); }
  };

  const handlePayFarmer = async (saleId) => {
    if (!saleId) return toast.error(t('no_grain_sale_linked'));
    setActionLoading('pay' + saleId);
    try {
      await api.patch(`/admin/grain-sales/${saleId}/pay`);
      toast.success(t('farmer_paid_successfully'));
      queryClient.invalidateQueries({ queryKey: ['admin-booking-slots'] });
    } catch (err) {
      if (err.response?.status === 404) toast.error(t('payment_already_processed'));
      else toast.error(err.response?.data?.error || t('action_failed'));
    } finally { setActionLoading(null); }
  };

  const openInspect = (slot) => {
    setInspectSlot(slot);
    setInspectForm({
      good_quantity_kg: String(parseFloat(slot.quantity_kg) || ''),
      bad_quantity_kg: '0',
      rejection_reason: '',
      notes: '',
    });
  };

  const handleInspectSubmit = async (e) => {
    e.preventDefault();
    const good  = parseFloat(inspectForm.good_quantity_kg);
    const bad   = parseFloat(inspectForm.bad_quantity_kg);
    const total = parseFloat(inspectSlot.quantity_kg);
    if (isNaN(good) || isNaN(bad))      return toast.error(t('enter_valid_quantities'));
    if (good < 0 || bad < 0)            return toast.error(t('quantities_cannot_be_negative'));
    const sum = parseFloat((good + bad).toFixed(4));
    if (Math.abs(sum - total) > 0.01)   return toast.error(`${t('good_bad_must_equal_total')} (${sum} kg / ${total} kg)`);
    if (bad > 0 && !inspectForm.rejection_reason) return toast.error(t('select_rejection_reason'));
    setInspectSaving(true);
    try {
      await api.post(`/admin/booking-slots/${inspectSlot.id}/inspect`, {
        good_quantity_kg: good,
        bad_quantity_kg: bad,
        rejection_reason: bad > 0 ? inspectForm.rejection_reason : null,
        notes: inspectForm.notes || null,
      });
      toast.success(t('inspection_saved'));
      setInspectSlot(null);
      queryClient.invalidateQueries({ queryKey: ['admin-booking-slots'] });
    } catch (err) { toast.error(err.response?.data?.error || t('inspection_failed')); }
    finally { setInspectSaving(false); }
  };

  const openEditYield = (slot) => {
    setEditYieldSlot(slot);
    setEditYieldForm({
      good_quantity_kg: String(parseFloat(slot.good_quantity_kg || slot.quantity_kg) || ''),
      bad_quantity_kg: String(parseFloat(slot.bad_quantity_kg || 0)),
    });
  };

  const handleEditYieldSubmit = async (e) => {
    e.preventDefault();
    const good = parseFloat(editYieldForm.good_quantity_kg);
    const bad = parseFloat(editYieldForm.bad_quantity_kg);
    if (isNaN(good) || isNaN(bad) || good < 0 || bad < 0) return toast.error(t('enter_valid_non_negative'));
    
    setEditSaving(true);
    try {
      await api.put(`/admin/booking-slots/${editYieldSlot.id}/edit-yield`, {
        good_quantity_kg: good,
        bad_quantity_kg: bad,
      });
      toast.success(t('yield_updated_success'));
      setEditYieldSlot(null);
      queryClient.invalidateQueries({ queryKey: ['admin-booking-slots'] });
    } catch (err) { toast.error(err.response?.data?.error || t('failed_to_update_yield')); }
    finally { setEditSaving(false); }
  };

  const filtered = slots.filter((s) => {
    const matchFilter = filter === 'all' || s.status === filter;
    const matchSearch = !search
      || s.farmer_name?.toLowerCase().includes(search.toLowerCase())
      || s.grain_type?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filterTabs = ['all', 'pending', 'confirmed', 'delivered', 'Inspection Completed', 'completed', 'cancelled'];

  // Live balance values for inspect modal
  const inspectTotal = parseFloat(inspectSlot?.quantity_kg) || 0;
  const inspectGood  = parseFloat(inspectForm.good_quantity_kg) || 0;
  const inspectBad   = parseFloat(inspectForm.bad_quantity_kg)  || 0;
  const inspectSum   = parseFloat((inspectGood + inspectBad).toFixed(4));
  const inspectValid = Math.abs(inspectSum - inspectTotal) <= 0.01;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('booking_slot', 'Booking Slots')}</h1>
          <p className="page-subtitle">{t('manage_booking_desc', 'Manage warehouse deliveries and crop inspections')}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_farmer_grain', 'Search by farmer or grain…')} className="input-field pl-10" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterTabs.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                filter === s ? 'bg-primary-600 text-white border-primary-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {s === 'all' ? t('all') : t(STATUS_META[s]?.key || s)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead><tr>
              <th>{t('date')}</th><th>{t('farmer')}</th><th>{t('grain_qty')}</th>
              <th>{t('warehouse')}</th><th>{t('delivery_address')}</th><th>{t('status')}</th><th>{t('actions')}</th>
            </tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></td></tr>
                : filtered.length === 0
                  ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">{t('no_booking_slots_found', 'No booking slots found')}</td></tr>
                  : filtered.map((s) => (
                    <tr key={s.id}>
                      <td className="font-semibold text-gray-800">{s.booking_date}</td>
                      <td>
                        <p className="font-semibold text-gray-800">{s.farmer_name}</p>
                        <p className="text-xs text-gray-500">{s.phone}</p>
                      </td>
                      <td>
                        <p className="font-medium">{s.grain_type}</p>
                        <p className="text-xs text-green-600 font-bold">{s.quantity_kg} kg {t('total_lower')}</p>
                        {(s.good_quantity_kg !== null && s.good_quantity_kg !== undefined) && (
                          <div className="mt-1 flex gap-2 text-[10px] font-semibold">
                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{t('good_qty_kg', { qty: s.good_quantity_kg })}</span>
                            {s.bad_quantity_kg > 0 && <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{t('waste_qty_kg', { qty: s.bad_quantity_kg })}</span>}
                          </div>
                        )}
                      </td>
                      <td><p className="text-sm font-medium">{s.warehouse_name}</p></td>
                      <td className="text-xs max-w-[140px] truncate">
                        <MapPin size={12} className="inline mr-1 text-gray-400" />{s.delivery_address}
                      </td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {/* Details */}
                          <button onClick={() => setSelectedSlot(s)}
                            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:text-primary-600 hover:bg-primary-50" title={t('view_details')}>
                            <Eye size={14} />
                          </button>

                          {/* Edit Yield (Winnowing) */}
                          {(s.status === 'completed' || s.status === 'Inspection Completed') && (
                            <button onClick={() => openEditYield(s)}
                              className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200" title={t('edit_good_waste_yield')}>
                              <Edit2 size={14} />
                            </button>
                          )}

                          {/* Pending → Confirm / Cancel */}
                          {s.status === 'pending' && (<>
                            <button onClick={() => { setAssignSlotModal(s); setSelectedWarehouseSlotId(''); }} disabled={actionLoading === s.id + 'confirmed'}
                              className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50" title={t('confirm_and_assign_slot')}>
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handleAction(s.id, 'cancelled')} disabled={actionLoading === s.id + 'cancelled'}
                              className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-50" title="Cancel">
                              <X size={14} />
                            </button>
                          </>)}

                          {/* Confirmed → Mark Delivered */}
                          {s.status === 'confirmed' && (
                            <button onClick={() => handleAction(s.id, 'delivered')} disabled={actionLoading === s.id + 'delivered'}
                              className="btn-sm bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1 disabled:opacity-50">
                              <Truck size={13} /> {t('delivered')}
                            </button>
                          )}

                          {/* Delivered → Inspect */}
                          {s.status === 'delivered' && (
                            <button onClick={() => openInspect(s)}
                              className="btn-sm bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1">
                              <FlaskConical size={13} /> {t('inspect')}
                            </button>
                          )}

                          {/* Inspection Completed → Pay */}
                          {s.status === 'Inspection Completed' && s.grain_sale_id && (
                            <button onClick={() => handlePayFarmer(s.grain_sale_id)} disabled={actionLoading === 'pay' + s.grain_sale_id}
                              className="btn-sm bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 disabled:opacity-50">
                              <DollarSign size={13} /> {t('pay')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Slot Details Modal ─── */}
      {selectedSlot && (
        <div className="modal-overlay" onClick={() => setSelectedSlot(null)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-gray-800 text-lg">{t('booking_details')}</h3>
              <button onClick={() => setSelectedSlot(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 uppercase">{t('booking_id')}</p><p className="font-medium">#{selectedSlot.id}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('booked_on')}</p><p className="font-medium">{new Date(selectedSlot.created_at).toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('delivery_date')}</p><p className="font-medium">{selectedSlot.booking_date}</p></div>
                {selectedSlot.grain_sale_id && <div><p className="text-xs text-gray-500 uppercase">{t('sale_id')}</p><p className="font-medium text-primary-600">#{selectedSlot.grain_sale_id}</p></div>}
                <div><p className="text-xs text-gray-500 uppercase">{t('farmer')}</p><p className="font-medium">{selectedSlot.farmer_name}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('phone')}</p><p className="font-medium">{selectedSlot.phone}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('grain_type')}</p><p className="font-medium">{selectedSlot.grain_type}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('total_quantity')}</p><p className="font-medium text-green-600">{selectedSlot.quantity_kg} kg</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('warehouse')}</p><p className="font-medium">{selectedSlot.warehouse_name}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">{t('status')}</p><StatusBadge status={selectedSlot.status} /></div>
                <div className="col-span-2"><p className="text-xs text-gray-500 uppercase">{t('delivery_address')}</p><p className="font-medium text-sm">{selectedSlot.delivery_address}</p></div>
                {selectedSlot.notes && <div className="col-span-2"><p className="text-xs text-gray-500 uppercase">{t('notes')}</p><p className="text-sm bg-gray-50 p-2 rounded-lg">{selectedSlot.notes}</p></div>}
              </div>

              {/* Inspection results section */}
              {selectedSlot.inspection_id && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl space-y-3">
                  <h4 className="font-semibold text-violet-800 flex items-center gap-2 text-sm">
                    <ClipboardList size={16} /> {t('inspection_report')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-lg">
                      <ThumbsUp size={14} className="text-green-600" />
                      <div><p className="text-xs text-green-700 font-medium">{t('good_quality')}</p><p className="font-bold text-green-800">{selectedSlot.good_quantity_kg} kg</p></div>
                    </div>
                    <div className="flex items-center gap-2 bg-red-100 px-3 py-2 rounded-lg">
                      <ThumbsDown size={14} className="text-red-600" />
                      <div><p className="text-xs text-red-700 font-medium">{t('rejected')}</p><p className="font-bold text-red-800">{selectedSlot.bad_quantity_kg} kg</p></div>
                    </div>
                    {selectedSlot.rejection_reason && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">{t('rejection_reason')}</p>
                        <p className="font-medium text-red-700 flex items-center gap-1"><AlertTriangle size={13} /> {selectedSlot.rejection_reason}</p>
                      </div>
                    )}
                    {selectedSlot.inspection_notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">{t('inspector_notes')}</p>
                        <p className="text-sm bg-white p-2 rounded-lg border border-violet-100">{selectedSlot.inspection_notes}</p>
                      </div>
                    )}
                    <div className="col-span-2 flex justify-between text-xs text-gray-500">
                      <span>{t('inspector')}: <strong>{selectedSlot.inspector_name}</strong></span>
                      <span>{selectedSlot.inspection_date ? new Date(selectedSlot.inspection_date).toLocaleDateString('en-IN') : ''}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Inspect Crop Modal ─── */}
      {inspectSlot && (
        <div className="modal-overlay" onClick={() => !inspectSaving && setInspectSlot(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <FlaskConical size={20} className="text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{t('crop_inspection')}</h3>
                  <p className="text-xs text-gray-500">{inspectSlot.farmer_name} · {inspectSlot.grain_type} · {inspectSlot.quantity_kg} kg total</p>
                </div>
              </div>
              {!inspectSaving && <button onClick={() => setInspectSlot(null)} className="btn-icon"><X size={18} /></button>}
            </div>

            <form onSubmit={handleInspectSubmit} className="modal-body space-y-4">
              {/* Live balance indicator */}
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                inspectValid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <span>{t('total_received')}: <strong>{inspectSlot.quantity_kg} kg</strong></span>
                <span>
                  {t('entered')}: <strong>{inspectSum} kg</strong>
                  {!inspectValid && inspectSum > 0 && (
                    <span className="ml-2 text-xs text-red-500">({inspectSum > inspectTotal ? '+' : ''}{(inspectSum - inspectTotal).toFixed(2)} kg)</span>
                  )}
                </span>
              </div>

              {/* Good quantity — auto-adjusts bad */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <ThumbsUp size={14} className="text-green-600" /> {t('good_quality_qty')} *
                </label>
                <input type="number"
                  value={inspectForm.good_quantity_kg}
                  onChange={(e) => {
                    const good = parseFloat(e.target.value) || 0;
                    const remaining = Math.max(0, parseFloat((inspectTotal - good).toFixed(4)));
                    setInspectForm((f) => ({ ...f, good_quantity_kg: e.target.value, bad_quantity_kg: String(remaining) }));
                  }}
                  className="input-field" min="0.01" max={inspectSlot.quantity_kg} step="0.01" required />
              </div>

              {/* Bad quantity — auto-adjusts good */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <ThumbsDown size={14} className="text-red-500" /> {t('rejected_bad_quality_qty')} *
                </label>
                <input type="number"
                  value={inspectForm.bad_quantity_kg}
                  onChange={(e) => {
                    const bad = parseFloat(e.target.value) || 0;
                    const remaining = Math.max(0, parseFloat((inspectTotal - bad).toFixed(4)));
                    setInspectForm((f) => ({ ...f, bad_quantity_kg: e.target.value, good_quantity_kg: String(remaining) }));
                  }}
                  className="input-field" min="0.01" max={inspectSlot.quantity_kg} step="0.01" required />
              </div>

              {/* Rejection reason (required when bad > 0) */}
              {inspectBad > 0 && (
                <div>
                  <label className="label flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-500" /> {t('reason_for_rejection')} *
                  </label>
                  <select value={inspectForm.rejection_reason}
                    onChange={(e) => setInspectForm((f) => ({ ...f, rejection_reason: e.target.value }))}
                    className="input-field" required>
                    <option value="">{t('select_reason_placeholder')}</option>
                    {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="label">{t('inspection_notes_optional')}</label>
                <textarea value={inspectForm.notes}
                  onChange={(e) => setInspectForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input-field resize-none" rows={3} placeholder={t('additional_observations')} />
              </div>
            </form>

            <div className="modal-footer">
              <button type="button" onClick={() => setInspectSlot(null)} className="btn-ghost" disabled={inspectSaving}>{t('cancel')}</button>
              <button onClick={handleInspectSubmit} disabled={inspectSaving || !inspectValid}
                className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {inspectSaving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <ClipboardList size={16} />}
                {inspectSaving ? t('saving') : t('save_inspection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Yield Modal ─── */}
      {editYieldSlot && (
        <div className="modal-overlay" onClick={() => !editSaving && setEditYieldSlot(null)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Edit2 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{t('edit_yield')}</h3>
                  <p className="text-xs text-gray-500">{t('update_good_waste_seed')}</p>
                </div>
              </div>
              {!editSaving && <button onClick={() => setEditYieldSlot(null)} className="btn-icon"><X size={18} /></button>}
            </div>

            <form onSubmit={handleEditYieldSubmit} className="modal-body space-y-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <ThumbsUp size={14} className="text-green-600" /> {t('good_seed_kg')} *
                </label>
                <input type="number"
                  value={editYieldForm.good_quantity_kg}
                  onChange={(e) => setEditYieldForm((f) => ({ ...f, good_quantity_kg: e.target.value }))}
                  className="input-field" min="0.01" step="0.01" required />
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <ThumbsDown size={14} className="text-red-500" /> {t('waste_seed_kg')} *
                </label>
                <input type="number"
                  value={editYieldForm.bad_quantity_kg}
                  onChange={(e) => setEditYieldForm((f) => ({ ...f, bad_quantity_kg: e.target.value }))}
                  className="input-field" min="0.01" step="0.01" required />
              </div>
            </form>

            <div className="modal-footer">
              <button type="button" onClick={() => setEditYieldSlot(null)} className="btn-ghost" disabled={editSaving}>{t('cancel')}</button>
              <button onClick={handleEditYieldSubmit} disabled={editSaving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {editSaving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle size={16} />}
                {editSaving ? t('updating') : t('update')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Assign Slot Modal ─── */}
      {assignSlotModal && (
        <div className="modal-overlay" onClick={() => setAssignSlotModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><Calendar size={20} className="text-green-600" /></div>
                <div><h3 className="font-bold text-gray-800">{t('assign_time_slot')}</h3><p className="text-xs text-gray-500">{t('assign_slot_confirm_booking')}</p></div>
              </div>
              <button onClick={() => setAssignSlotModal(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="label">{t('select_time_slot_for')} {assignSlotModal.booking_date} *</label>
                {slotsLoadingStatus ? (
                  <div className="text-sm text-gray-500 animate-pulse">{t('loading_slots')}</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-sm text-red-500">{t('no_time_slots_available')}</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableSlots.map(slot => {
                      const isFull = parseFloat(slot.booked_capacity_kg) + parseFloat(assignSlotModal.quantity_kg) > parseFloat(slot.total_capacity_kg);
                      const available_kg = parseFloat(slot.total_capacity_kg) - parseFloat(slot.booked_capacity_kg);
                      const isSelected = selectedWarehouseSlotId === slot.id.toString();
                      
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isFull}
                          onClick={() => setSelectedWarehouseSlotId(slot.id.toString())}
                          className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all
                            ${isFull ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' : 
                              isSelected ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-200' : 'bg-white border-gray-200 hover:border-primary-300'}`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-semibold text-gray-800 text-sm">{slot.start_time} - {slot.end_time}</span>
                            {isFull ? <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">{t('full')}</span> :
                             <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">{t('availability')}</span>}
                          </div>
                          <span className="text-xs text-gray-500">{t('kg_available_count', { count: available_kg.toFixed(0) })}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setAssignSlotModal(null)} className="btn-ghost">{t('cancel')}</button>
              <button 
                onClick={() => handleAction(assignSlotModal.id, 'confirmed', selectedWarehouseSlotId)} 
                disabled={!selectedWarehouseSlotId || actionLoading === assignSlotModal.id + 'confirmed'} 
                className="btn-primary flex items-center gap-2"
              >
                {actionLoading === assignSlotModal.id + 'confirmed' ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {t('confirm_booking')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
