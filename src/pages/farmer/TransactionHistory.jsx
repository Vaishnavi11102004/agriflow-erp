import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import farmerService from '../../services/farmerService';
import { useAuth } from '../../context/AuthContext';
import { History, Download, ArrowUpCircle, ArrowDownCircle, Search, X, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadPDFReport } from '../../utils/pdfExport';
import { BRAND_NAME } from '../../utils/brandLogo';

export default function TransactionHistory() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedTx, setSelectedTx] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: ['farmer-transactions', user?.id],
    queryFn: () => farmerService.getTransactions(user.id),
    enabled: !!user?.id
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
    if (filtered.length === 0) { toast.error(t('no_logs_found', 'No transactions found to export.')); return; }
    const periodLabel = { all: 'All Time', '1week': 'Last 1 Week', '1month': 'Last 1 Month', '6weeks': 'Last 6 Weeks', '3months': 'Last 3 Months', '6months': 'Last 6 Months' }[timeFilter] || 'All Time';
    const filteredCredit = filtered.filter(t => t.direction === 'credit').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const filteredDebit = filtered.filter(t => t.direction === 'debit').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    downloadPDFReport({
      title: `Transaction Ledger — ${periodLabel}`,
      filtersText: `Period: ${periodLabel}${filter !== 'all' ? ` · Type: ${filter}` : ''}`,
      summary: [
        `Total Earned: Rs. ${filteredCredit.toLocaleString('en-IN')}`,
        `Total Spent: Rs. ${filteredDebit.toLocaleString('en-IN')}`,
        `Transactions: ${filtered.length}`,
      ],
      columns: ['Date', 'Type', 'Description', 'UPI ID', 'Transaction ID', 'Invoice', 'Amount', 'Status'],
      rows: filtered.map(tx => [
        new Date(tx.created_at).toLocaleDateString('en-IN'),
        tx.direction === 'credit' ? 'Credit' : 'Debit',
        tx.description || '-',
        tx.upi_id || '-',
        tx.transaction_id || '-',
        tx.invoice_number || '-',
        `${tx.direction === 'credit' ? '+' : '-'}Rs. ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        tx.status,
      ]),
    }, `SriSivaSaiSeeds_Transactions_${periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`);
  };

  const downloadInvoice = (tx) => {
    downloadPDFReport({
      title: `Invoice ${tx.invoice_number}`,
      filtersText: '',
      summary: [
        `Date: ${new Date(tx.created_at).toLocaleString('en-IN')}`,
        `Amount: Rs. ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `Status: ${tx.status.toUpperCase()}`,
      ],
      columns: ['Invoice', 'Description', 'Transaction ID', 'UPI ID', 'Amount'],
      rows: [[tx.invoice_number, tx.description || '-', tx.transaction_id || '-', tx.upi_id || '-', `Rs. ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]],
    }, `Invoice_${tx.invoice_number}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('transaction_history')}</h1><p className="page-subtitle">{t('transaction_history_desc')}</p></div>
        <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2"><Download size={16} />{t('export_report', 'Export Report')}</button>
      </div>

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
        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {filtered.length === 0
            ? <p className="text-center py-10 text-gray-400 text-sm">{t('no_transactions_found')}</p>
            : filtered.map(tx => (
              <button key={tx.id} onClick={() => setSelectedTx(tx)} className="w-full text-left p-4 space-y-1 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.direction === 'credit' ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}{t(tx.direction)}
                  </span>
                  <span className={`font-bold text-sm ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.direction === 'credit' ? '+' : '-'}₹{parseFloat(tx.amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 truncate">{tx.description || '-'}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-IN')}</span>
                  <span className={`badge ${tx.status === 'completed' ? 'badge-green' : tx.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>{tx.status}</span>
                </div>
              </button>
            ))
          }
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block table-container">
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
                        {tx.direction === 'credit' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}{t(tx.direction)}
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
                    <td className="flex items-center gap-2">
                      <span className={`badge ${tx.status === 'completed' ? 'badge-green' : tx.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>{tx.status}</span>
                      <button onClick={() => { setSelectedTx(tx); setShowQR(true); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors" title="View QR"><QrCode size={14} /></button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Modal */}
      {selectedTx && showQR && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Payment QR</h3>
              <button onClick={() => setShowQR(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center gap-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=sivasivaseeds@upi%26pn=${encodeURIComponent(BRAND_NAME)}%26am=${selectedTx.amount}%26tn=${encodeURIComponent(selectedTx.description || (BRAND_NAME + ' Payment'))}`}
                alt="Payment QR"
                className="w-44 h-44 rounded-lg"
              />
              <p className="text-xs text-gray-500">Scan with any UPI app</p>
              <p className="text-lg font-black text-primary-700">₹{parseFloat(selectedTx.amount).toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400 truncate max-w-full">{selectedTx.description || '-'}</p>
            </div>
            <p className="text-[10px] text-gray-400">This is a demo QR for reference only</p>
          </div>
        </div>
      )}

      {/* Mobile transaction detail modal */}
      {selectedTx && !showQR && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setSelectedTx(null)}>
          <div className="bg-white w-full rounded-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{t('transaction_details', 'Transaction Details')}</h3>
              <button onClick={() => setSelectedTx(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="flex justify-between items-center">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${selectedTx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                {selectedTx.direction === 'credit' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}{t(selectedTx.direction)}
              </span>
              <span className={`text-xl font-black ${selectedTx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                {selectedTx.direction === 'credit' ? '+' : '-'}₹{parseFloat(selectedTx.amount).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              {[
                [t('description'), selectedTx.description || '-'],
                [t('date'), new Date(selectedTx.created_at).toLocaleString('en-IN')],
                [t('status'), selectedTx.status],
                [t('upi_id'), selectedTx.upi_id || '-'],
                [t('transaction_id'), selectedTx.transaction_id || '-'],
                [t('invoice'), selectedTx.invoice_number || '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-400 text-xs font-medium shrink-0">{label}</span>
                  <span className="text-gray-800 font-semibold text-xs text-right break-all">{value}</span>
                </div>
              ))}
            </div>
            {selectedTx.invoice_number && (
              <button onClick={() => downloadInvoice(selectedTx)} className="w-full btn-primary flex items-center justify-center gap-2">
                <Download size={15} /> {t('download_invoice', 'Download Invoice')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
