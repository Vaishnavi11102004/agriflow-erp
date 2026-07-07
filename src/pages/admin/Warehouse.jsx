import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { Warehouse, Plus, X, CheckCircle, PackageSearch } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WarehouseManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', total_capacity_kg: '' });
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [showInvModal, setShowInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ grain_type: 'Rice', custom_type: '', quantity_kg: '' });
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({ slot_date: '', start_time: '', end_time: '', total_capacity_kg: '' });

  const { data: warehouses = [], isLoading: loading } = useQuery({
    queryKey: ['admin-warehouses'],
    queryFn: async () => {
      const res = await api.get('/admin/warehouses');
      return res.data;
    }
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['admin-warehouse-slots', selectedInventory?.id],
    queryFn: async () => {
      const res = await api.get(`/admin/warehouse-slots?warehouse_id=${selectedInventory.id}`);
      return res.data;
    },
    enabled: !!selectedInventory
  });

  // Update selected inventory reference when warehouses list updates
  useEffect(() => {
    if (selectedInventory && warehouses.length) {
      const updated = warehouses.find(w => w.id === selectedInventory.id);
      if (updated) setSelectedInventory(updated);
    }
  }, [warehouses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/warehouses', { ...form, total_capacity_kg: parseFloat(form.total_capacity_kg) });
      toast.success(t('warehouse_created'));
      setShowModal(false); 
      queryClient.invalidateQueries({ queryKey: ['admin-warehouses'] });
    } catch { toast.error(t('failed_to_create') || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleAddInventory = async (e) => {
    e.preventDefault();
    const finalGrainType = invForm.grain_type === 'Other Seeds' ? invForm.custom_type.trim() : invForm.grain_type;
    if (!finalGrainType) {
      toast.error('Please enter the seed type');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/warehouses/${selectedInventory.id}/inventory`, {
        grain_type: finalGrainType,
        quantity_kg: parseFloat(invForm.quantity_kg)
      });
      toast.success('Inventory added');
      setShowInvModal(false);
      setInvForm({ grain_type: 'Rice', custom_type: '', quantity_kg: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-warehouses'] });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add inventory'); }
    finally { setSaving(false); }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/warehouse-slots', {
        warehouse_id: selectedInventory.id,
        ...slotForm,
        total_capacity_kg: parseFloat(slotForm.total_capacity_kg)
      });
      toast.success('Time slot created');
      setShowSlotModal(false);
      setSlotForm({ slot_date: '', start_time: '', end_time: '', total_capacity_kg: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-warehouse-slots', selectedInventory.id] });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create slot'); }
    finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('warehouse')}</h1><p className="page-subtitle">{t("warehouse_desc")}</p></div>
        <button onClick={() => { setForm({ name: '', address: '', total_capacity_kg: '' }); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} />{t('add_warehouse')}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            : warehouses.length === 0 ? <p className="text-gray-400 text-center py-10">{t("no_warehouses")}</p>
              : warehouses.map(w => {
                const pct = (w.current_load_kg / w.total_capacity_kg) * 100;
                return (
                  <div key={w.id} className={`glass-card p-5 cursor-pointer transition-all ${selectedInventory?.id === w.id ? 'ring-2 ring-primary-500' : 'hover:-translate-y-1 hover:shadow-lg'}`} onClick={() => setSelectedInventory(w)}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{w.name}</h3>
                        <p className="text-xs text-gray-500">{w.address}</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Warehouse size={20} className="text-blue-500" /></div>
                    </div>
                    <div className="warehouse-bar mb-2">
                      <div className={pct > 80 ? 'warehouse-fill-red' : pct > 60 ? 'warehouse-fill-yellow' : 'warehouse-fill-green'} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t("used")}: {(w.current_load_kg / 1000).toFixed(0)}T</span>
                      <span className="font-bold text-gray-800">{pct.toFixed(1)}% {t("full")}</span>
                      <span>{t("total")}: {(w.total_capacity_kg / 1000).toFixed(0)}T</span>
                    </div>
                  </div>
                );
              })
          }
        </div>

        <div>
          {selectedInventory ? (
            <div className="glass-card p-6 sticky top-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><PackageSearch size={18} className="text-primary-600" />{t('inventory')}: {selectedInventory.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowSlotModal(true)} className="btn-secondary btn-sm flex items-center gap-1"><Plus size={14} /> {t('add_slot', 'Add Slot')}</button>
                  <button onClick={() => setShowInvModal(true)} className="btn-secondary btn-sm flex items-center gap-1"><Plus size={14} /> {t('add_inv', 'Add Inv')}</button>
                </div>
              </div>
              {selectedInventory.inventory.length === 0 ? <p className="text-gray-400 text-sm py-4">{t("no_inventory_data")}</p> : (
                <div className="space-y-3">
                  {selectedInventory.inventory.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800">{inv.grain_type}</p>
                        <p className="text-[10px] text-gray-500">{t("updated")}: {new Date(inv.last_updated).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-700">{inv.quantity_kg.toLocaleString('en-IN')} kg</p>
                        <p className="text-[10px] text-gray-500">{((inv.quantity_kg / selectedInventory.total_capacity_kg) * 100).toFixed(1)}% of total cap</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 border-t border-gray-100 pt-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">{t('time_slots', 'Time Slots')}</h3>
                {slotsLoading ? <p className="text-gray-400 text-sm">{t('loading_slots', 'Loading slots...')}</p> 
                  : slots.length === 0 ? <p className="text-gray-400 text-sm">{t('no_slots_created', 'No slots created yet.')}</p> 
                  : (
                  <div className="space-y-3">
                    {slots.map(slot => {
                      const pct = (slot.booked_capacity_kg / slot.total_capacity_kg) * 100;
                      return (
                        <div key={slot.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">{slot.slot_date}</p>
                            <p className="text-xs text-gray-500">{slot.start_time} - {slot.end_time}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-800">{slot.booked_capacity_kg} / {slot.total_capacity_kg} kg</p>
                            <p className="text-[10px] text-gray-500">{pct.toFixed(1)}% booked</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-10 flex flex-col items-center justify-center text-center text-gray-400 h-full min-h-[300px]">
              <PackageSearch size={48} className="mb-4 text-gray-300" />
              <p>{t("select_warehouse_desc")}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Warehouse size={20} className="text-blue-600" /></div><div><h3 className="font-bold text-gray-800">{t("add_warehouse")}</h3></div></div>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-4">
              <div><label className="label">{t("warehouse_name")} *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
              <div><label className="label">{t("address")} *</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-field" required /></div>
              <div><label className="label">{t("total_capacity_kg")} *</label><input type="number" value={form.total_capacity_kg} onChange={e => setForm(f => ({ ...f, total_capacity_kg: e.target.value }))} className="input-field" min="100" step="100" required /></div>
            </form>
            <div className="modal-footer">
              <button onClick={() => { setForm({ name: '', address: '', total_capacity_kg: '' }); setShowModal(false); }} className="btn-ghost">{t("cancel")}</button>
              <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}{saving ? t('saving') : t('save_warehouse')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvModal && selectedInventory && (
        <div className="modal-overlay" onClick={() => setShowInvModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><PackageSearch size={20} className="text-green-600" /></div><div><h3 className="font-bold text-gray-800">{t('add_inventory_to', 'Add Inventory to')} {selectedInventory.name}</h3></div></div>
              <button onClick={() => setShowInvModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddInventory} className="modal-body space-y-4">
              <div>
                <label className="label">{t('grain_seed_type', 'Grain/Seed Type')} *</label>
                <select value={invForm.grain_type} onChange={e => setInvForm(f => ({ ...f, grain_type: e.target.value }))} className="input-field" required>
                  <option value="Rice">Rice</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Maize">Maize</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Groundnut">Groundnut</option>
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Other Seeds">Other Seeds</option>
                </select>
              </div>
              {invForm.grain_type === 'Other Seeds' && (
                <div>
                  <label className="label">{t('enter_custom_seed_type', 'Enter Custom Seed Type')} *</label>
                  <input type="text" value={invForm.custom_type} onChange={e => setInvForm(f => ({ ...f, custom_type: e.target.value }))} className="input-field" placeholder="e.g. Sunflower" required />
                </div>
              )}
              <div><label className="label">{t('quantity_kg', 'Quantity (kg)')} *</label><input type="number" value={invForm.quantity_kg} onChange={e => setInvForm(f => ({ ...f, quantity_kg: e.target.value }))} className="input-field" min="1" step="1" required /></div>
            </form>
            <div className="modal-footer">
              <button onClick={() => { setInvForm({ grain_type: 'Rice', custom_type: '', quantity_kg: '' }); setShowInvModal(false); }} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleAddInventory} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}{saving ? t('saving') : t('add_inventory', 'Add Inventory')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSlotModal && selectedInventory && (
        <div className="modal-overlay" onClick={() => setShowSlotModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><PackageSearch size={20} className="text-purple-600" /></div><div><h3 className="font-bold text-gray-800">{t('add_time_slot', 'Add Time Slot')}</h3><p className="text-xs text-gray-500">{selectedInventory.name}</p></div></div>
              <button onClick={() => setShowSlotModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSlot} className="modal-body space-y-4">
              <div><label className="label">{t('date', 'Date')} *</label><input type="date" value={slotForm.slot_date} onChange={e => setSlotForm(f => ({ ...f, slot_date: e.target.value }))} className="input-field" min={new Date().toISOString().split('T')[0]} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('start_time', 'Start Time')} *</label><input type="time" value={slotForm.start_time} onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))} className="input-field" required /></div>
                <div><label className="label">{t('end_time', 'End Time')} *</label><input type="time" value={slotForm.end_time} onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))} className="input-field" required /></div>
              </div>
              <div><label className="label">{t('slot_capacity_kg', 'Slot Capacity (kg)')} *</label><input type="number" value={slotForm.total_capacity_kg} onChange={e => setSlotForm(f => ({ ...f, total_capacity_kg: e.target.value }))} className="input-field" min="100" step="100" required /></div>
            </form>
            <div className="modal-footer">
              <button onClick={() => { setSlotForm({ slot_date: '', start_time: '', end_time: '', total_capacity_kg: '' }); setShowSlotModal(false); }} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleCreateSlot} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}{saving ? t('saving') : t('create_slot', 'Create Slot')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
