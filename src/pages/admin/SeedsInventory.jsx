import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import storageService from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';
import { CACHE_TIMES } from '../../lib/queryConfig';
import { Package, Plus, X, CheckCircle, Edit, Search, Trash2, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SeedsInventory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const defaultForm = { id: null, name: '', variety: '', price_per_kg: '', stock_kg: '', description: '', image_url: '', warehouse_ids: [], is_active: 1 };
  const [form, setForm] = useState(defaultForm);
  const [initialForm, setInitialForm] = useState(defaultForm);

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const { url } = await storageService.uploadBase64(ev.target.result, 'seed');
          setForm(f => ({ ...f, image_url: url }));
        } catch {
          toast.error('Image upload failed');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingImage(false);
    }
  };

  const { data: seeds = [], isLoading: loading } = useQuery({
    queryKey: ['admin-seeds'],
    queryFn: () => adminService.getSeeds(),
    ...CACHE_TIMES.LONG
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['admin-warehouses-list'],
    queryFn: () => adminService.getWarehouses(),
    ...CACHE_TIMES.LONG
  });

  const openAdd = () => { setForm(defaultForm); setInitialForm(defaultForm); setShowModal(true); };
  const openEdit = (s) => {
    const editState = { ...s, is_active: s.is_active ? 1 : 0, warehouse_ids: (s.warehouses || []).map(w => w.id) };
    setForm(editState);
    setInitialForm(editState);
    setShowModal(true);
  };

  // Check if form changed
  const isUnchanged = !!form.id && JSON.stringify(form) === JSON.stringify(initialForm);

  const handleDelete = async (seed) => {
    if (!window.confirm(`Are you sure you want to delete "${seed.name}"? This action cannot be undone.`)) return;
    try {
      await adminService.deleteSeed(seed.id);
      toast.success(t('seed_deleted', 'Seed deleted successfully'));
      queryClient.invalidateQueries({ queryKey: ['admin-seeds'] });
    } catch (err) {
      toast.error(err.message || t('delete_failed', 'Delete failed'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price_per_kg: parseFloat(form.price_per_kg), stock_kg: parseFloat(form.stock_kg), warehouse_ids: form.warehouse_ids.map(Number), is_active: form.is_active ? 1 : 0, image_url: form.image_url || null };
      if (form.id) await adminService.updateSeed(form.id, payload);
      else await adminService.createSeed(payload);
      toast.success(form.id ? t('seed_updated') : t('seed_added'));
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin-seeds'] });
    } catch { toast.error(t('save_failed')); }
    finally { setSaving(false); }
  };

  const filtered = seeds.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.variety || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('seeds_inventory')}</h1><p className="page-subtitle">{t("seeds_inventory_desc")}</p></div>
        {(user?.role === 'super_admin' || user?.role === 'admin') && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={16} />{t("add_seed")}</button>
        )}
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_seeds")} className="input-field pl-10" />
      </div>

      <div className="glass-card overflow-hidden">
        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading
            ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            : filtered.length === 0
              ? <p className="text-center py-10 text-gray-400 text-sm">{t('no_seeds_found')}</p>
              : filtered.map(s => (
                <div key={s.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.variety || '-'}</p>
                    </div>
                    <span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? t('active') : t('inactive')}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="font-bold text-agro-green">₹{s.price_per_kg}/kg</span>
                    <span className={s.stock_kg < 500 ? 'text-red-500 font-bold' : ''}>{s.stock_kg.toLocaleString()} kg stock</span>
                    {s.stock_kg < 500 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">{t('low')}</span>}
                    <span className="text-amber-600 font-semibold">{Number(s.on_hold_kg || 0).toLocaleString()} kg on hold</span>
                  </div>
                  {s.warehouses && s.warehouses.length > 0 && (
                    <div className="flex flex-wrap gap-1">{s.warehouses.map(w => <span key={w.id} className="badge-blue text-[10px]">{w.name}</span>)}</div>
                  )}
                  <div className="flex gap-1.5 pt-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100" title={t('edit')}><Edit size={14} /></button>
                    <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title={t('delete', 'Delete')}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
          }
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block table-container">
          <table className="data-table">
            <thead><tr>
              <th>{t("seed_name")}</th><th>{t("variety")}</th><th>{t("price_per_kg")}</th><th>{t("stock_kg")}</th><th>{t("on_hold", "On Hold")}</th><th>{t("warehouse", "Warehouse")}</th><th>{t("status")}</th><th>{t("actions")}</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">{t("no_seeds_found")}</td></tr>
                  : filtered.map(s => (
                    <tr key={s.id}>
                      <td className="font-semibold text-gray-800">{s.name}</td>
                      <td>{s.variety || '-'}</td>
                      <td className="font-bold text-agro-green">₹{s.price_per_kg}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={s.stock_kg < 500 ? 'text-red-500 font-bold' : ''}>{s.stock_kg.toLocaleString()}</span>
                          {s.stock_kg < 500 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">{t("low")}</span>}
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold text-amber-600">{Number(s.on_hold_kg || 0).toLocaleString()} kg</span>
                      </td>
                      <td>{s.warehouses && s.warehouses.length > 0
                        ? <div className="flex flex-wrap gap-1">{s.warehouses.map(w => <span key={w.id} className="badge-blue text-[10px]">{w.name}</span>)}</div>
                        : <span className="text-xs text-gray-400 italic">{t('unassigned', 'Unassigned')}</span>}
                      </td>
                      <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? t('active') : t('inactive')}</span></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100" title={t('edit')}><Edit size={14} /></button>
                          <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title={t('delete', 'Delete')}><Trash2 size={14} /></button>
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
        <div className="modal-overlay items-start pt-4 sm:items-center sm:pt-0" onClick={() => setShowModal(false)}>
          <div className="modal-content w-full mx-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center"><Package size={20} className="text-primary-600" /></div>
                <div><h3 className="font-bold text-gray-800">{form.id ? t('edit_seed') : t('add_new_seed')}</h3></div>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form id="seed-form" onSubmit={handleSubmit} className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t("seed_name")} *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`input-field ${user?.role === 'manager' ? 'bg-gray-100 cursor-not-allowed' : ''}`} disabled={user?.role === 'manager'} required />
                </div>
                <div>
                  <label className="label">{t("variety")}</label>
                  <input value={form.variety} onChange={e => setForm(f => ({ ...f, variety: e.target.value }))} className={`input-field ${user?.role === 'manager' ? 'bg-gray-100 cursor-not-allowed' : ''}`} disabled={user?.role === 'manager'} />
                </div>
                <div>
                  <label className="label">
                    Price/kg (₹) * {user?.role === 'manager' && form.id && <span className="text-red-500 font-normal ml-1">{t("admin_only")}</span>}
                  </label>
                  <input
                    type="number"
                    value={form.price_per_kg}
                    onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))}
                    className={`input-field ${user?.role === 'manager' && form.id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    step="0.5"
                    min="1"
                    required
                    disabled={user?.role === 'manager' && !!form.id}
                  />
                </div>
                <div><label className="label">{t("stock_kg")} *</label><input type="number" value={form.stock_kg} onChange={e => setForm(f => ({ ...f, stock_kg: e.target.value }))} className="input-field" step="1" min="1" required /></div>
                <div>
                  <label className="label">{t("warehouse", "Warehouse")}</label>
                  <div className="border border-gray-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2">
                    {warehouses.length === 0
                      ? <p className="text-xs text-gray-400">{t('no_warehouses', 'No warehouses available')}</p>
                      : warehouses.map(w => (
                        <label key={w.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.warehouse_ids.includes(w.id)}
                            onChange={e => setForm(f => ({
                              ...f,
                              warehouse_ids: e.target.checked
                                ? [...f.warehouse_ids, w.id]
                                : f.warehouse_ids.filter(id => id !== w.id)
                            }))}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{w.name}</span>
                        </label>
                      ))
                    }
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{t('seed_warehouse_hint', 'Where this seed batch is physically stocked.')}</p>
                </div>
              </div>
              <div>
                <label className="label">Seed Image</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt="preview" className="h-24 w-full object-cover rounded-xl border border-gray-200" />
                    <button type="button" onClick={() => { setForm(f => ({ ...f, image_url: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow border border-gray-200"><X size={14} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage || user?.role === 'manager'}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploadingImage ? <span className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" /> : <><ImagePlus size={20} /><span className="text-xs">Click to upload image</span></>}
                  </button>
                )}
              </div>
              <div>
                <label className="label">{t("description")}</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`input-field min-h-[80px] ${user?.role === 'manager' ? 'bg-gray-100 cursor-not-allowed' : ''}`} disabled={user?.role === 'manager'} />
              </div>
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" disabled={user?.role === 'manager'} />
                <span className={`text-sm ${user?.role === 'manager' ? 'text-gray-400' : 'text-gray-700'}`}>{t("active_visible_to_farmers")}</span>
              </label>
            </form>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t("cancel")}</button>
              <button type="submit" form="seed-form" disabled={saving || isUnchanged} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {saving ? t('saving') : t('save_seed')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
