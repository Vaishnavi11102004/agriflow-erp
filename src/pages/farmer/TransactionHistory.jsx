import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { History, Download, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionHistory() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: ['farmer-transactions'],
    queryFn: async () => {
      const res = await api.get('/farmer/transactions');
      return res.data;
    }
  });

  const filtered = transactions.filter(t => {
    const matchFilter = filter === 'all' || t.direction === filter;
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.transaction_id?.includes(search) || t.invoice_number?.includes(search);
    
    let matchTime = true;
    if (timeFilter !== 'all') {
      const diffDays = Math.ceil(Math.abs(new Date() - new Date(t.created_at)) / (1000 * 60 * 60 * 24));
      if (timeFilter === '1week') matchTime = diffDays <= 7;
      else if (timeFilter === '1month') matchTime = diffDays <= 30;
      else if (timeFilter === '6weeks') matchTime = diffDays <= 42;
      else if (timeFilter === '3months') matchTime = diffDays <= 90;
      else if (timeFilter === '6months') matchTime = diffDays <= 180;
    }

    return matchFilter && matchSearch && matchTime;
  });

  const totalCredit = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalDebit = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const downloadCSV = () => {
    if (filtered.length === 0) {
      toast.error(t('no_logs_found', 'No transactions found to export.'));
      return;
    }

    const headers = ['Date', 'Type', 'Description', 'UPI ID', 'Transaction ID', 'Invoice No', 'Amount', 'Status'];
    const rows = filtered.map(tx => [
      new Date(tx.created_at).toLocaleDateString('en-IN'),
      tx.direction,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.upi_id || '',
      tx.transaction_id || '',
      tx.invoice_number || '',
      tx.amount,
      tx.status
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadInvoice = (tx) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${tx.invoice_number}</title>
    <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #1f2937; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .detail-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .value { font-size: 16px; font-weight: 600; color: #0f172a; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">AgriFlow ERP</div>
        <div class="invoice-title">INVOICE</div>
    </div>
    
    <div class="details-grid">
        <div class="detail-box">
            <div class="label">Invoice Number</div>
            <div class="value">${tx.invoice_number}</div>
        </div>
        <div class="detail-box">
            <div class="label">Date</div>
            <div class="value">${new Date(tx.created_at).toLocaleString('en-IN')}</div>
        </div>
        <div class="detail-box">
            <div class="label">Amount</div>
            <div class="value" style="color: #16a34a; font-size: 20px;">₹${tx.amount}</div>
        </div>
        <div class="detail-box">
            <div class="label">Status</div>
            <div class="value">${tx.status.toUpperCase()}</div>
        </div>
    </div>
    
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin-top: 0; color: #334155;">Description</h3>
        <p style="margin-bottom: 0;">${tx.description}</p>
        <p style="margin-bottom: 0; color: #64748b; font-size: 14px;">Transaction Type: ${tx.direction}</p>
    </div>

    <div class="footer">
        <p>Thank you for using AgriFlow!</p>
        <small>This is a computer-generated invoice and requires no signature.</small>
    </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Invoice_${tx.invoice_number}.html`; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('transaction_history')}</h1><p className="page-subtitle">{t('transaction_history_desc')}</p></div>
        <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2"><Download size={16} />{t('export_csv', 'Export CSV')}</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-icon bg-green-500"><ArrowUpCircle size={22} /></div>
          <div><p className="stat-value text-green-600">₹{totalCredit.toLocaleString('en-IN')}</p><p className="stat-label">{t('total_earned')}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-red-500"><ArrowDownCircle size={22} /></div>
          <div><p className="stat-value text-red-500">₹{totalDebit.toLocaleString('en-IN')}</p><p className="stat-label">{t('total_spent')}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-blue-500"><History size={22} /></div>
          <div><p className="stat-value">{transactions.length}</p><p className="stat-label">{t('total_transactions')}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search_tx_placeholder')} className="input-field pl-10" />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="input-field py-2 text-sm max-w-[150px]">
            <option value="all">{t('all_time', 'All Time')}</option>
            <option value="1week">{t('last_1_week', 'Last 1 Week')}</option>
            <option value="1month">{t('last_1_month', 'Last 1 Month')}</option>
            <option value="6weeks">{t('last_6_weeks', 'Last 6 Weeks')}</option>
            <option value="3months">{t('last_3_months', 'Last 3 Months')}</option>
            <option value="6months">{t('last_6_months', 'Last 6 Months')}</option>
          </select>
          <div className="tab-nav mb-0">
            {['all', 'credit', 'debit'].map(f => (
              <button key={f} className={`tab-btn capitalize ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{t(f)}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead><tr>
              <th>{t('date')}</th><th>{t('type')}</th><th>{t('description')}</th><th>{t('upi_id')}</th><th>{t('transaction_id')}</th><th>{t('invoice')}</th><th>{t('amount')}</th><th>{t('status')}</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">{t('no_transactions_found')}</td></tr>
                : filtered.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-xs">{new Date(tx.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.direction === 'credit' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                        {t(tx.direction)}
                      </span>
                    </td>
                    <td className="text-xs max-w-[180px] truncate">{tx.description || '-'}</td>
                    <td className="text-xs">{tx.upi_id || '-'}</td>
                    <td className="text-xs">{tx.transaction_id || '-'}</td>
                    <td>{tx.invoice_number ? (
                      <button onClick={() => downloadInvoice(tx)} className="badge-blue text-[10px] flex items-center gap-1 hover:bg-blue-200 transition-colors">
                        {tx.invoice_number} <Download size={10} />
                      </button>
                    ) : '-'}</td>
                    <td className={`font-bold ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.direction === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                    <td><span className={`badge ${tx.status === 'completed' ? 'badge-green' : tx.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>{tx.status}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
