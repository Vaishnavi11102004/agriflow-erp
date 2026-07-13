import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, Search, Download, X, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SeedPurchases() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const { data: purchases = [], isLoading: loading } = useQuery({
    queryKey: ['admin-seed-purchases'],
    queryFn: () => adminService.getSeedPurchases()
  });

  const filtered = purchases.filter(p => {
    const matchStatus = statusFilter === 'all' || p.payment_status === statusFilter;
    const matchSearch = !search ||
      p.farmer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.seed_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice_number?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusBadge = (s) => ({ paid: 'badge-green', pending: 'badge-yellow', failed: 'badge-red' }[s] || 'badge-gray');

  const handleApproveReject = async (id, status) => {
    setActionLoading(id + status);
    try {
      await adminService.updateSeedPurchaseStatus(id, status, user?.id);
      toast.success(`Purchase marked ${status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-seed-purchases'] });
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const downloadInvoice = (purchase) => {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice - ${purchase.invoice_number || `SP-${purchase.id}`}</title>
    <style>body{font-family:sans-serif;padding:40px;color:#333;background:#f8fafc}
    .invoice{background:#fff;padding:48px;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);max-width:800px;margin:auto}
    .header{display:flex;justify-content:space-between;border-bottom:3px solid #16a34a;padding-bottom:24px;margin-bottom:32px}
    .logo{font-size:28px;font-weight:900;color:#16a34a}
    table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:12px;text-align:left;font-size:12px;text-transform:uppercase}
    td{padding:14px;border:1px solid #e2e8f0;font-size:14px}.text-right{text-align:right}
    .total-row{background:#f0fdf4}.total-row td{font-weight:800;font-size:16px;color:#16a34a}
    .footer{text-align:center;color:#94a3b8;font-size:12px;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:20px}</style></head>
    <body><div class="invoice">
    <div class="header"><div class="logo">🌱 AgriFlow ERP</div>
    <div style="text-align:right"><h2>INVOICE</h2><div>${purchase.invoice_number || `SP-${String(purchase.id).padStart(5,'0')}`}</div>
    <div>${purchase.created_at ? new Date(purchase.created_at).toLocaleDateString('en-IN') : '-'}</div></div></div>
    <p><strong>Farmer:</strong> ${purchase.farmer_name || '-'} | <strong>Phone:</strong> ${purchase.farmer_phone || '-'}</p>
    <table><thead><tr><th>Item</th><th>Variety</th><th class="text-right">Qty (kg)</th><th class="text-right">Price/kg</th><th class="text-right">Total</th></tr></thead>
    <tbody><tr><td>${purchase.seed_name || '-'}</td><td>${purchase.seed_variety || '-'}</td>
    <td class="text-right">${purchase.quantity_kg || 0}</td><td class="text-right">₹${parseFloat(purchase.price_per_kg || 0).toFixed(2)}</td>
    <td class="text-right">₹${parseFloat(purchase.total_amount || 0).toFixed(2)}</td></tr>
    <tr class="total-row"><td colspan="4" class="text-right">Grand Total</td><td class="text-right">₹${parseFloat(purchase.total_amount || 0).toFixed(2)}</td></tr>
    </tbody></table>
    <p><strong>Status:</strong> ${(purchase.payment_status || 'pending').toUpperCase()}</p>
    <div class="footer">AgriFlow Management System — System-generated invoice. No signature required.</div>
    </div></body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice_${purchase.invoice_number || `SP-${purchase.id}`}.html`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Invoice downloaded!');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('seed_purchases') || 'Seed Purchases'}</h1>
          <p className="page-subtitle">{t('seed_purchases_desc') || 'View all seed purchases by farmers'}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by farmer, seed or invoice..." className="input-field pl-10" />
        </div>
        <div className="tab-nav mb-0 flex-shrink-0">
          {['all', 'paid', 'pending', 'failed'].map(s => (
            <button key={s} className={`tab-btn capitalize ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            : filtered.length === 0 ? <p className="text-center py-10 text-gray-400 text-sm">No seed purchases found</p>
            : filtered.map(p => (
              <div key={p.id} className="p-4 cursor-pointer" onClick={() => setSelectedPurchase(p)}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-semibold text-gray-800">{p.farmer_name}</p>
                    <p className="text-xs text-gray-500">{p.seed_name} · {p.quantity_kg} kg</p>
                  </div>
                  <span className={`badge ${statusBadge(p.payment_status)}`}>{p.payment_status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '-'}</span>
                  <span className="font-bold text-gray-900">₹{parseFloat(p.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            ))
          }
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block table-container">
          <table className="data-table">
            <thead><tr>
              <th>{t('invoice') || 'Invoice'}</th>
              <th>{t('farmer') || 'Farmer'}</th>
              <th>{t('seed') || 'Seed'}</th>
              <th>{t('quantity') || 'Qty (kg)'}</th>
              <th>{t('price_per_kg') || 'Price/kg'}</th>
              <th>{t('total') || 'Total'}</th>
              <th>{t('status') || 'Status'}</th>
              <th>{t('date') || 'Date'}</th>
              <th>{t('actions') || 'Actions'}</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No seed purchases found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-mono text-xs font-semibold text-primary-700">{p.invoice_number || `SP-${String(p.id).padStart(5, '0')}`}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">{p.farmer_name?.[0]}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{p.farmer_name}</p>
                        <p className="text-[10px] text-gray-400">{p.farmer_phone}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-sm font-medium text-gray-800">{p.seed_name}</p>
                    <p className="text-[10px] text-gray-400">{p.seed_variety}</p>
                  </td>
                  <td>{p.quantity_kg}</td>
                  <td className="font-semibold">₹{p.price_per_kg}</td>
                  <td className="font-bold text-gray-900">₹{parseFloat(p.total_amount || 0).toLocaleString()}</td>
                  <td><span className={`badge ${statusBadge(p.payment_status)}`}>{p.payment_status}</span></td>
                  <td className="text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => downloadInvoice(p)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Download Invoice">
                        <Download size={14} />
                      </button>
                      {p.payment_status === 'pending' && (
                        <>
                          <button onClick={() => handleApproveReject(p.id, 'paid')} disabled={actionLoading === p.id + 'paid'} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50" title="Approve">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => handleApproveReject(p.id, 'failed')} disabled={actionLoading === p.id + 'failed'} className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-50" title="Reject">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile detail modal */}
      {selectedPurchase && (
        <div className="modal-overlay items-start pt-4 sm:items-center sm:pt-0" onClick={() => setSelectedPurchase(null)}>
          <div className="modal-content max-w-sm w-full mx-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-gray-800">Purchase Details</h3>
              <button onClick={() => setSelectedPurchase(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-500">Invoice</p><p className="font-mono font-semibold text-primary-700">{selectedPurchase.invoice_number || `SP-${selectedPurchase.id}`}</p></div>
                <div><p className="text-xs text-gray-500">Status</p><span className={`badge ${statusBadge(selectedPurchase.payment_status)}`}>{selectedPurchase.payment_status}</span></div>
                <div><p className="text-xs text-gray-500">Farmer</p><p className="font-semibold">{selectedPurchase.farmer_name}</p></div>
                <div><p className="text-xs text-gray-500">Phone</p><p>{selectedPurchase.farmer_phone}</p></div>
                <div><p className="text-xs text-gray-500">Seed</p><p className="font-semibold">{selectedPurchase.seed_name}</p></div>
                <div><p className="text-xs text-gray-500">Variety</p><p>{selectedPurchase.seed_variety || '-'}</p></div>
                <div><p className="text-xs text-gray-500">Quantity</p><p>{selectedPurchase.quantity_kg} kg</p></div>
                <div><p className="text-xs text-gray-500">Price/kg</p><p>₹{selectedPurchase.price_per_kg}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-500">Total Amount</p><p className="font-bold text-lg text-gray-900">₹{parseFloat(selectedPurchase.total_amount || 0).toLocaleString()}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-500">Date</p><p>{selectedPurchase.created_at ? new Date(selectedPurchase.created_at).toLocaleDateString('en-IN') : '-'}</p></div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setSelectedPurchase(null)} className="btn-ghost">Close</button>
              <button onClick={() => { downloadInvoice(selectedPurchase); setSelectedPurchase(null); }} className="btn-primary flex items-center gap-2">
                <Download size={14} /> Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
