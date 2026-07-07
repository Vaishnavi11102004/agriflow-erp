import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api/axios';
import {
  MapPin, Search, CheckCircle, Navigation, Upload, Camera,
  Image as ImageIcon, Calendar, Clock, Phone, Bell, X, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function DaysChip({ dateStr }) {
  const days = getDaysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Overdue</span>;
  if (days === 0) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold animate-pulse"><Bell size={10} /> Today!</span>;
  if (days === 1) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold"><Bell size={10} /> Tomorrow</span>;
  if (days === 2) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold"><Bell size={10} /> 2 days</span>;
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium"><Calendar size={10} /> {days}d away</span>;
}

export default function FarmVisits() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState({});
  const [visitDates, setVisitDates] = useState({});
  const [completingId, setCompletingId] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [detailVisit, setDetailVisit] = useState(null);

  // Add Visit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeCrops, setActiveCrops] = useState([]);
  const [addForm, setAddForm] = useState({ crop_id: '', farmer_id: '', admin_id: '', visit_month: '', scheduled_date: '' });
  const [adding, setAdding] = useState(false);

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: managers = [] } = useQuery({
    queryKey: ['admin-managers'],
    queryFn: async () => {
      const res = await api.get('/admin/managers');
      return res.data;
    },
    enabled: isSuperAdmin
  });

  const { data: visits = [], isLoading: loading } = useQuery({
    queryKey: ['admin-visits'],
    queryFn: async () => {
      const res = await api.get('/admin/visits');
      return res.data;
    }
  });

  const handleAction = async (id, status) => {
    setCompletingId(id);
    try {
      const payload = { status, actual_date: new Date().toISOString().split('T')[0] };
      // Upload photo as a real file if one was selected
      if (selectedPhoto[id]) {
        const uploadRes = await api.post('/upload', { image: selectedPhoto[id] });
        payload.report = uploadRes.data.url; // store the file URL, not base64
      }
      await api.patch(`/admin/visits/${id}`, payload);
      toast.success('Visit marked as ' + status);
      setSelectedPhoto(prev => { const n = { ...prev }; delete n[id]; return n; });
      queryClient.invalidateQueries({ queryKey: ['admin-visits'] });
    } catch {
      toast.error(t('action_failed'));
    } finally {
      setCompletingId(null);
    }
  };

  const updateScheduledDate = async (id) => {
    if (!visitDates[id]) return toast.error('Please select a date first');
    try {
      await api.patch(`/admin/visits/${id}`, { scheduled_date: visitDates[id] });
      toast.success('Visit date updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-visits'] });
    } catch {
      toast.error('Failed to update date');
    }
  };

  const openAddModal = async () => {
    try {
      const { data } = await api.get('/admin/active-crops');
      setActiveCrops(data);
      setAddForm({ crop_id: '', farmer_id: '', admin_id: '', visit_month: '', scheduled_date: '' });
      setShowAddModal(true);
    } catch {
      toast.error('Failed to load active crops');
    }
  };

  const handleAddVisit = async (e) => {
    e.preventDefault();
    if (!addForm.crop_id || !addForm.visit_month || !addForm.scheduled_date) return toast.error('All fields required');
    setAdding(true);
    try {
      await api.post('/admin/visits', addForm);
      toast.success('Visit scheduled successfully');
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin-visits'] });
    } catch {
      toast.error('Failed to schedule visit');
    } finally {
      setAdding(false);
    }
  };

  const handleAssignManager = async (visitId, managerId) => {
    try {
      await api.patch(`/admin/visits/${visitId}`, { admin_id: managerId || null });
      toast.success('Manager assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-visits'] });
      if (detailVisit?.id === visitId) {
        const manager = managers.find(m => m.id.toString() === managerId);
        setDetailVisit(prev => ({
          ...prev,
          admin_id: managerId || null,
          manager_name: manager?.name || 'Unassigned',
          manager_phone: manager?.phone || ''
        }));
      }
    } catch {
      toast.error('Failed to assign manager');
    }
  };

  const handlePhotoUpload = (e, id) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    const reader = new FileReader();
    reader.onloadend = () => setSelectedPhoto(prev => ({ ...prev, [id]: reader.result }));
    reader.readAsDataURL(file);
  };

  const filtered = visits.filter(v => {
    const matchFilter = filter === 'all' || v.status === filter;
    const matchSearch =
      !search ||
      v.farmer_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.crop_type?.toLowerCase().includes(search.toLowerCase()) ||
      v.farmer_phone?.includes(search);
    return matchFilter && matchSearch;
  });

  const statusBadge = (s) =>
    ({ scheduled: 'badge-blue', pending: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red' }[s] || 'badge-gray');

  const counts = {
    all: visits.length,
    scheduled: visits.filter(v => v.status === 'scheduled').length,
    pending: visits.filter(v => v.status === 'pending').length,
    completed: visits.filter(v => v.status === 'completed').length,
  };

  return (
    <div className="animate-fade-in">
      {/* Photo preview modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X size={28} />
            </button>
            <img src={previewPhoto} alt="Farm visit" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('farm_visits')}</h1>
          <p className="page-subtitle">{t('farm_visits_desc')}</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center gap-1.5 hidden sm:flex">
            <Bell size={13} className="text-amber-600" />
            <span>Farmers get notified <strong>2 days</strong> before each visit</span>
          </div>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2 py-2">
            <Plus size={16} /> Schedule Visit
          </button>
        </div>
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by farmer, crop or phone…"
            className="input-field pl-10"
          />
        </div>
        <div className="tab-nav mb-0 flex-shrink-0">
          {[
            { key: 'all', label: 'All' },
            { key: 'scheduled', label: 'Scheduled' },
            ...(isSuperAdmin ? [{ key: 'pending', label: 'Pending' }] : []),
            { key: 'completed', label: 'Done' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`tab-btn capitalize ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="col-span-full text-center py-12 text-gray-400">{t('no_visits_found')}</p>
        ) : (
          filtered.map(v => (
            <div key={v.id} className="glass-card p-5 hover-lift flex flex-col gap-0">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <span className={`badge ${statusBadge(v.status)}`}>{v.status}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">Month {v.visit_month}</span>
                  {(v.status === 'scheduled' || v.status === 'pending') && v.scheduled_date && (
                    <DaysChip dateStr={v.scheduled_date} />
                  )}
                  <button 
                    onClick={() => setDetailVisit(v)} 
                    className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                  >
                    View Detail
                  </button>
                </div>
              </div>

              {/* Farmer info */}
              <h3 className="font-bold text-gray-800 text-lg mb-0.5">{v.farmer_name}</h3>
              {v.farmer_phone && (
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Phone size={11} className="text-gray-400" /> {v.farmer_phone}
                </p>
              )}
              {v.crop_address && (
                <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                  <MapPin size={11} className="text-gray-400" />
                  <span className="truncate">{v.crop_address}</span>
                </p>
              )}

              {/* Crop info */}
              <div className="bg-primary-50 p-3 rounded-xl border border-primary-100 mb-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500 text-xs">{t('crop')}</span>
                  <span className="font-semibold text-gray-800">{v.crop_type}</span>
                </div>
                {v.sowing_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">{t('sowed')}</span>
                    <span className="text-gray-700">{v.sowing_date}</span>
                  </div>
                )}
              </div>

              {/* Scheduled date section */}
              {(v.status === 'scheduled' || v.status === 'pending') && (
                <div className="mb-4">
                  {/* Current scheduled date display */}
                  {v.scheduled_date && (
                    <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <Calendar size={13} className="text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Scheduled for</p>
                        <p className="text-sm font-bold text-blue-700">
                          {new Date(v.scheduled_date).toLocaleDateString('en-IN', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Date picker to reschedule */}
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    {v.scheduled_date ? 'Reschedule Date' : 'Set Visit Date'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="input-field py-1.5 px-3 text-xs flex-1 border border-gray-200 rounded-lg bg-gray-50"
                      value={visitDates[v.id] || v.scheduled_date || ''}
                      onChange={(e) => setVisitDates(p => ({ ...p, [v.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => updateScheduledDate(v.id)}
                      disabled={!visitDates[v.id]}
                      className="btn-primary py-1.5 px-4 text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap disabled:opacity-40"
                    >
                      <Clock size={12} className="inline mr-1" />Save
                    </button>
                  </div>
                </div>
              )}

              {/* Photo upload + complete (for active visits) */}
              {(v.status === 'pending' || v.status === 'scheduled') && (
                <div className="space-y-3 mt-auto border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <ImageIcon size={13} /> Capture Farm Status
                  </p>
                  <div className="flex gap-2">
                    <label className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-emerald-50 text-emerald-700 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors border border-emerald-200 border-dashed">
                      <Camera size={18} />
                      <span className="text-xs font-semibold">Take Photo</span>
                      <input type="file" accept="image/*" capture="camera" className="hidden" onChange={(e) => handlePhotoUpload(e, v.id)} />
                    </label>
                    <label className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-blue-50 text-blue-700 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200 border-dashed">
                      <Upload size={18} />
                      <span className="text-xs font-semibold">Upload Image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, v.id)} />
                    </label>
                  </div>

                  {selectedPhoto[v.id] && (
                    <div className="relative mt-1 group cursor-pointer" onClick={() => setPreviewPhoto(selectedPhoto[v.id])}>
                      <div
                        className="h-28 w-full rounded-xl bg-cover bg-center shadow-inner border border-gray-200"
                        style={{ backgroundImage: `url(${selectedPhoto[v.id]})` }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-full">Preview</span>
                      </div>
                      <button
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); setSelectedPhoto(p => { const n = { ...p }; delete n[v.id]; return n; }); }}
                      >
                        <X size={11} />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                        ✓ Photo ready
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(v.id, 'completed')}
                      disabled={completingId === v.id}
                      className="btn-primary w-full flex justify-center items-center gap-1 text-sm disabled:opacity-70"
                    >
                      {completingId === v.id
                        ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        : <><CheckCircle size={14} />{t('done')}</>
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Completed visit */}
              {v.status === 'completed' && (
                <div className="mt-auto pt-3 border-t border-gray-100">
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1 justify-center py-2 bg-green-50 rounded-lg mb-2">
                    <CheckCircle size={13} /> {t('visit_completed')}
                  </p>
                  {v.actual_date && (
                    <p className="text-xs text-gray-400 text-center mb-2 flex items-center gap-1 justify-center">
                      <Calendar size={11} /> Visited on {new Date(v.actual_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  {v.report && (
                    <img
                      src={v.report.startsWith('data:image') ? v.report : v.report}
                      alt="Farm visit photo"
                      className="w-full h-32 object-cover rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewPhoto(v.report)}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {/* Add Visit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Schedule Farm Visit</h3>
                  <p className="text-xs text-gray-500">Manually schedule a visit for a farmer</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleAddVisit} className="modal-body space-y-4">
              <div>
                <label className="label">Select Crop &amp; Farmer *</label>
                <select 
                  className="input-field" 
                  value={addForm.crop_id} 
                  onChange={(e) => {
                    const crop = activeCrops.find(c => c.crop_id.toString() === e.target.value);
                    setAddForm(f => ({ ...f, crop_id: e.target.value, farmer_id: crop ? crop.farmer_id : '' }));
                  }}
                  required
                >
                  <option value="">-- Choose an active crop --</option>
                  {activeCrops.map(c => (
                     <option key={c.crop_id} value={c.crop_id}>
                       {c.farmer_name} - {c.crop_type} ({c.acres} acres) sowed {c.sowing_date}
                     </option>
                  ))}
                </select>
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="label">Assign Manager (Optional)</label>
                  <select 
                    className="input-field"
                    value={addForm.admin_id}
                    onChange={(e) => setAddForm(f => ({ ...f, admin_id: e.target.value }))}
                  >
                    <option value="">-- Unassigned --</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Visit Month Number *</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="12"
                    className="input-field" 
                    placeholder="e.g. 2"
                    value={addForm.visit_month}
                    onChange={e => setAddForm(f => ({ ...f, visit_month: e.target.value }))}
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Which month of the crop cycle</p>
                </div>
                <div>
                  <label className="label">Scheduled Date *</label>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    className="input-field" 
                    value={addForm.scheduled_date}
                    onChange={e => setAddForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </form>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
              <button type="button" onClick={handleAddVisit} disabled={adding} className="btn-primary flex items-center gap-2">
                {adding ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {adding ? 'Scheduling...' : 'Schedule Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit Detail Modal */}
      {detailVisit && (
        <div className="modal-overlay" onClick={() => setDetailVisit(null)}>
          <div className="modal-content max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Visit Detail</h3>
                  <p className="text-xs text-gray-500">Status: {detailVisit.status}</p>
                </div>
              </div>
              <button onClick={() => setDetailVisit(null)} className="btn-icon"><X size={18} /></button>
            </div>
            
            <div className="modal-body space-y-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Farmer Details */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-1.5"><MapPin size={14} className="text-gray-400"/> Farmer Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Name:</span> <span className="font-semibold text-gray-800">{detailVisit.farmer_name || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="text-gray-700">{detailVisit.farmer_phone || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Crop:</span> <span className="text-gray-700">{detailVisit.crop_type || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Sowed:</span> <span className="text-gray-700">{detailVisit.sowing_date || 'N/A'}</span></div>
                    <div className="mt-2 text-gray-500 text-xs">Address:<br/><span className="text-gray-700 block mt-0.5">{detailVisit.crop_address || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Manager Details */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-1.5"><Phone size={14} className="text-gray-400"/> Manager Details</h4>
                  <div className="space-y-3 text-sm">
                    {isSuperAdmin ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500">Assign Manager:</span>
                        <select 
                          className="input-field py-1 px-2 text-sm"
                          value={detailVisit.admin_id || ''}
                          onChange={(e) => handleAssignManager(detailVisit.id, e.target.value)}
                        >
                          <option value="">-- Unassigned --</option>
                          {managers.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex justify-between"><span className="text-gray-500">Manager:</span> <span className="font-semibold text-gray-800">{detailVisit.manager_name || 'Unassigned'}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="text-gray-700">{detailVisit.manager_phone || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Visit Month:</span> <span className="text-gray-700">Month {detailVisit.visit_month}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Scheduled:</span> <span className="text-gray-700">{detailVisit.scheduled_date ? new Date(detailVisit.scheduled_date).toLocaleDateString() : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Visited On:</span> <span className="text-gray-700">{detailVisit.actual_date ? new Date(detailVisit.actual_date).toLocaleDateString() : 'N/A'}</span></div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">Description / Notes</h4>
                <p className="text-sm text-gray-700">{detailVisit.description || 'No description provided.'}</p>
              </div>

              {/* Uploaded Photo */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-1.5"><ImageIcon size={14} className="text-gray-400"/> Uploaded Photo</h4>
                {detailVisit.report ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <img 
                      src={detailVisit.report.startsWith('data:image') ? detailVisit.report : detailVisit.report} 
                      alt="Farm visit" 
                      className="w-full h-auto max-h-64 object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 text-gray-400 text-sm py-8 rounded-xl border border-gray-200 border-dashed text-center">
                    No photo uploaded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
