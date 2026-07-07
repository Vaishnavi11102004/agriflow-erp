import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { Wheat, Search, CheckCircle, X, DollarSign, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const GRAIN_TYPES = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Groundnut', 'Sugarcane'];

export default function GrainSalesAdmin() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    farmer_id: '',
    grain_type: 'Rice',
    grade: 'A',
    raw_material_kg: '',
    good_material_kg: '',
    wastage_kg: ''
  });

  const { data: sales = [], isLoading: loading } = useQuery({
    queryKey: ['admin-grain-sales'],
    queryFn: async () => {
      const res = await api.get('/admin/grain-sales');
      return res.data;
    }
  });

  const { data: farmers = [], isLoading: farmersLoading } = useQuery({
    queryKey: ['admin-farmers'],
    queryFn: async () => {
      const res = await api.get('/admin/farmers');
      return res.data;
    }
  });

  const handleLogCrop = async (e) => {
    e.preventDefault();
    if (!form.farmer_id || !form.raw_material_kg || !form.good_material_kg) {
      return toast.error('Please fill all required fields');
    }
    
    const rawQty = parseFloat(form.raw_material_kg) || 0;
    const goodQty = parseFloat(form.good_material_kg) || 0;
    const wastageQty = parseFloat(form.wastage_kg) || 0;

    if (goodQty + wastageQty > rawQty) {
      return toast.error('Good Quantity + Wastage cannot exceed Total Raw Material');
    }

    setSaving(true);
    try {
      await api.post('/admin/grain-sales/procure', {
        farmer_id: parseInt(form.farmer_id),
        grain_type: form.grain_type,
        grade: form.grade,
        raw_material_kg: rawQty,
        good_material_kg: goodQty,
        wastage_kg: wastageQty
      });
      toast.success('Crop procurement logged successfully!');
      setShowLogModal(false);
      setForm({ farmer_id: '', grain_type: 'Rice', grade: 'A', raw_material_kg: '', good_material_kg: '', wastage_kg: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-grain-sales'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log crop');
    } finally {
      setSaving(false);
    }
  };

  const handlePayFarmer = (sale) => {
    setSelectedPayment(sale);
    setPaymentDescription('');
  };

  const handleConfirmPayment = async (sale) => {
    setSaving(true);
    try {
      await api.patch(`/admin/grain-sales/${sale.id}/pay`, { description: paymentDescription });
      toast.success(t('payment_successful', 'Farmer paid successfully'));
      queryClient.invalidateQueries({ queryKey: ['admin-grain-sales'] });
      generateInvoice(sale);
      setSelectedPayment(null);
    } catch (err) {
      toast.error(err.response?.data?.error || t('action_failed'));
    } finally {
      setSaving(false);
    }
  };

  const generateInvoice = (sale) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${sale.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #16a34a; margin: 0 0 10px 0; }
            .details { margin-bottom: 30px; display: flex; justify-content: space-between; }
            .total { font-size: 1.2em; font-weight: bold; margin-top: 30px; border-top: 2px solid #16a34a; padding-top: 15px; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
            th { background-color: #f0fdf4; color: #166534; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AgriFlow Payment Invoice</h1>
            <p style="margin: 0;">Invoice #: INV-${sale.id}-${Date.now()}</p>
            <p style="margin: 0; color: #666;">Date: ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
          <div class="details">
            <div>
              <h3 style="margin-top: 0;">Farmer Details</h3>
              <p>Name: <strong>${sale.farmer_name}</strong></p>
              <p>Crop: ${sale.grain_type}</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin-top: 0;">AgriFlow Admin</h3>
              <p>Status: Paid</p>
            </div>
          </div>
          <table>
            <tr>
              <th>Description</th>
              <th>Grade</th>
              <th>Qty (kg)</th>
              <th>Rate (₹/kg)</th>
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
            <tr>
              <td>${sale.grain_type} Procurement</td>
              <td>${sale.grade}</td>
              <td>${sale.good_material_kg}</td>
              <td>${parseFloat(sale.price_per_kg || 0).toFixed(2)}</td>
              <td style="text-align: right;">${parseFloat(sale.total_amount || 0).toFixed(2)}</td>
            </tr>
          </table>
          <div class="total">
            Total Paid: ₹${(sale.total_amount || 0).toLocaleString('en-IN')}
          </div>
          <p style="margin-top: 60px; text-align: center; color: #888; font-size: 0.85em;">
            This is a computer generated electronic invoice and does not require a signature.
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const filtered = sales.filter(s => {
    const matchFilter = filter === 'all' || s.status === filter;
    const matchSearch = !search || s.farmer_name?.toLowerCase().includes(search.toLowerCase()) || s.grain_type?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusBadge = (s) => ({ received: 'badge-yellow', paid: 'badge-blue' }[s] || 'badge-gray');

  return (
    <div className="animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Crop Procurement</h1>
          <p className="page-subtitle">Log and manage crops received from farmers.</p>
        </div>
        <button onClick={() => setShowLogModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Log Received Crop
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_farmer_grain")} className="input-field pl-10" />
        </div>
        <div className="tab-nav mb-0 flex-shrink-0">
          {['all', 'received', 'paid'].map(s => (
            <button key={s} className={`tab-btn capitalize ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead><tr>
              <th>{t("farmer")}</th><th>{t("grain_grade")}</th><th>{t("good_qty_kg")}</th><th>{t("est_amount")}</th><th>{t("status")}</th><th>{t("date")}</th><th>{t("action")}</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">No procurements found.</td></tr>
                  : filtered.map(s => (
                    <tr key={s.id}>
                      <td className="font-semibold text-gray-800">{s.farmer_name}</td>
                      <td>
                        <span className="font-semibold">{s.grain_type}</span>
                        <span className="ml-2 badge bg-gray-100 text-gray-600">{t('grade')} {s.grade}</span>
                      </td>
                      <td className="text-green-600 font-semibold">{s.good_material_kg}</td>
                      <td className="font-bold">₹{(s.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                      <td className="text-xs">{new Date(s.created_at * 1000).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div className="flex gap-2 items-center">
                          {s.status === 'received' && (
                            <>
                              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">Crop Received</span>
                              <button onClick={() => handlePayFarmer(s)} className="btn-sm bg-green-600 hover:bg-green-700 text-white flex items-center gap-1">
                                <DollarSign size={14} /> Pay Farmer
                              </button>
                            </>
                          )}
                          {s.status === 'paid' && (
                            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
                              <CheckCircle size={12} /> Paid
                            </span>
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

      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Wheat size={20} className="text-amber-600" /></div><div><h3 className="font-bold text-gray-800">Log Received Crop</h3></div></div>
              <button onClick={() => setShowLogModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form id="log-crop-form" onSubmit={handleLogCrop} className="modal-body space-y-4">
              
              <div>
                <label className="label">Farmer *</label>
                <select value={form.farmer_id} onChange={e => setForm(f => ({ ...f, farmer_id: e.target.value }))} className="input-field" required>
                  <option value="">{farmersLoading ? 'Loading farmers...' : '-- Select Farmer --'}</option>
                  {farmers.filter(f => f.status === 'active').map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Crop Type *</label>
                  <select value={form.grain_type} onChange={e => setForm(f => ({ ...f, grain_type: e.target.value }))} className="input-field" required>
                    {GRAIN_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Grade *</label>
                  <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="input-field" required>
                    {['A', 'B', 'C'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Total Raw Qty (kg) *</label>
                  <input type="number" value={form.raw_material_kg} onChange={e => setForm(f => ({ ...f, raw_material_kg: e.target.value }))} className="input-field" placeholder="e.g. 1000" required />
                </div>
                <div>
                  <label className="label">Good Qty (kg) *</label>
                  <input type="number" value={form.good_material_kg} onChange={e => setForm(f => ({ ...f, good_material_kg: e.target.value }))} className="input-field" placeholder="e.g. 950" required />
                </div>
                <div>
                  <label className="label">Wastage (kg)</label>
                  <input type="number" value={form.wastage_kg} onChange={e => setForm(f => ({ ...f, wastage_kg: e.target.value }))} className="input-field" placeholder="e.g. 50" />
                </div>
              </div>

            </form>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowLogModal(false)} className="btn-ghost">{t("cancel")}</button>
              <button type="submit" form="log-crop-form" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}{saving ? t('processing') : 'Log Crop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <div><h3 className="font-bold text-gray-800">Pay Farmer</h3></div>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <h4 className="font-semibold text-gray-700">Bank Details for {selectedPayment.farmer_name}</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-600 border border-gray-200">
                <p><span className="font-medium text-gray-700">Bank Name:</span> {selectedPayment.bank_name || 'N/A'}</p>
                <p><span className="font-medium text-gray-700">Account Number:</span> {selectedPayment.account_number || 'N/A'}</p>
                <p><span className="font-medium text-gray-700">IFSC Code:</span> {selectedPayment.ifsc_code || 'N/A'}</p>
                <p><span className="font-medium text-gray-700">UPI ID:</span> {selectedPayment.upi_id || 'N/A'}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-green-800 text-sm mb-1">Total Amount to Pay</p>
                <p className="font-bold text-green-700 text-2xl">₹{(selectedPayment.total_amount || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <label className="label">Reason / Description (Optional)</label>
                <textarea 
                  value={paymentDescription} 
                  onChange={e => setPaymentDescription(e.target.value)} 
                  placeholder="e.g. Payment for rice procurement" 
                  className="input-field" 
                  rows={2} 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setSelectedPayment(null)} className="btn-ghost">{t("cancel")}</button>
              <button onClick={() => handleConfirmPayment(selectedPayment)} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}{saving ? t('processing') : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
