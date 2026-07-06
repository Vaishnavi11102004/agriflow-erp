import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { ShoppingBag, Search, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SeedPurchases() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: purchases = [], isLoading: loading } = useQuery({
    queryKey: ['admin-seed-purchases'],
    queryFn: async () => {
      const res = await api.get('/admin/seed-purchases');
      return res.data;
    }
  });

  const filtered = purchases.filter(p => {
    const matchStatus = statusFilter === 'all' || p.payment_status === statusFilter;
    const matchSearch = !search ||
      p.farmer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.seed_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice_number?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusBadge = (s) => ({
    paid: 'badge-green',
    pending: 'badge-yellow',
    failed: 'badge-red'
  }[s] || 'badge-gray');

  const downloadInvoice = (purchase) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice - ${purchase.invoice_number || `SP-${purchase.id}`}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 40px; color: #333; background: #f8fafc; }
        .invoice { background: #fff; padding: 48px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 800px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #16a34a; padding-bottom: 24px; margin-bottom: 32px; }
        .logo { font-size: 28px; font-weight: 900; color: #16a34a; letter-spacing: -0.5px; }
        .logo-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 28px; color: #1f2937; font-weight: 800; letter-spacing: 1px; }
        .invoice-number { font-size: 14px; color: #16a34a; font-weight: 600; margin-top: 4px; }
        .invoice-date { font-size: 13px; color: #64748b; margin-top: 2px; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 32px; gap: 32px; }
        .party { flex: 1; }
        .party-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
        .party-name { font-size: 16px; font-weight: 700; color: #1f2937; }
        .party-info { font-size: 13px; color: #64748b; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        th { text-align: left; padding: 14px 16px; background: #f1f5f9; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; border: 1px solid #e2e8f0; }
        td { padding: 14px 16px; border: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; }
        .text-right { text-align: right; }
        .total-row { background: #f0fdf4; }
        .total-row td { font-weight: 800; font-size: 16px; color: #16a34a; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-pending { background: #fef9c3; color: #854d0e; }
        .status-failed { background: #fee2e2; color: #991b1b; }
        .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        @media print { body { padding: 0; background: #fff; } .invoice { box-shadow: none; border-radius: 0; } }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div>
                <div class="logo">🌱 AgriFlow ERP</div>
                <div class="logo-sub">Agricultural Management System</div>
            </div>
            <div class="invoice-title">
                <h2>INVOICE</h2>
                <div class="invoice-number">${purchase.invoice_number || `SP-${String(purchase.id).padStart(5, '0')}`}</div>
                <div class="invoice-date">${purchase.created_at ? new Date(purchase.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</div>
            </div>
        </div>

        <div class="parties">
            <div class="party">
                <div class="party-label">Billed To</div>
                <div class="party-name">${purchase.farmer_name || '-'}</div>
                <div class="party-info">Phone: ${purchase.farmer_phone || '-'}</div>
            </div>
            <div class="party">
                <div class="party-label">From</div>
                <div class="party-name">AgriFlow Seeds Store</div>
                <div class="party-info">Seed Purchase Invoice</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Variety</th>
                    <th class="text-right">Qty (kg)</th>
                    <th class="text-right">Price/kg</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${purchase.seed_name || '-'}</td>
                    <td>${purchase.seed_variety || '-'}</td>
                    <td class="text-right">${purchase.quantity_kg || 0}</td>
                    <td class="text-right">₹${parseFloat(purchase.price_per_kg || 0).toFixed(2)}</td>
                    <td class="text-right">₹${parseFloat(purchase.total_amount || 0).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="4" class="text-right">Grand Total</td>
                    <td class="text-right">₹${parseFloat(purchase.total_amount || 0).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-bottom: 24px;">
            <strong style="font-size: 13px; color: #475569;">Payment Status:</strong>
            <span class="status status-${purchase.payment_status || 'pending'}">${(purchase.payment_status || 'pending').toUpperCase()}</span>
        </div>
        ${purchase.upi_id ? `<div style="margin-bottom: 8px;"><strong style="font-size: 13px; color: #475569;">UPI ID:</strong> <span style="font-size: 13px; color: #1e293b;">${purchase.upi_id}</span></div>` : ''}
        ${purchase.transaction_id ? `<div style="margin-bottom: 8px;"><strong style="font-size: 13px; color: #475569;">Transaction ID:</strong> <span style="font-size: 13px; color: #1e293b;">${purchase.transaction_id}</span></div>` : ''}

        <div class="footer">
            AgriFlow Management System &copy; ${new Date().getFullYear()}<br>
            <small>This is a system-generated invoice. No signature required.</small>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice_${purchase.invoice_number || `SP-${purchase.id}`}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Invoice downloaded!');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('seed_purchases') || 'Seed Purchases'}</h1>
          <p className="page-subtitle">{t('seed_purchases_desc') || 'View all seed purchases by farmers and download invoices'}</p>
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
        <div className="table-container">
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
                  <td className="text-xs">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td>
                    <button
                      onClick={() => downloadInvoice(p)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Download Invoice"
                    >
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
