import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { Search, DollarSign } from 'lucide-react';

export default function CreditsAdmin() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, credit, debit

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const res = await api.get('/admin/transactions');
      return res.data;
    }
  });

  const filtered = transactions.filter(tx => {
    const matchFilter = filter === 'all' || tx.direction === filter;
    const matchSearch = !search || 
      tx.farmer_name?.toLowerCase().includes(search.toLowerCase()) || 
      tx.phone?.includes(search) || 
      tx.description?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{t('credits') || 'Credits & Transactions'}</h1>
          <p className="page-subtitle">View all financial transactions and payment reasons.</p>
        </div>
        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
          <DollarSign size={24} className="text-green-600" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by farmer, phone, or reason..." 
            className="input-field pl-10" 
          />
        </div>
        <div className="tab-nav mb-0 flex-shrink-0">
          {['all', 'credit', 'debit'].map(s => (
            <button 
              key={s} 
              className={`tab-btn capitalize ${filter === s ? 'active' : ''}`} 
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Farmer</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th>Reason / Description</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">No transactions found.</td>
                </tr>
              ) : (
                filtered.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-sm">{new Date(tx.created_at * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <div className="font-semibold text-gray-800">{tx.farmer_name}</div>
                      <div className="text-xs text-gray-500">{tx.phone}</div>
                    </td>
                    <td className={`font-bold ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.direction === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${tx.direction === 'credit' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {tx.direction === 'credit' ? 'Credit' : 'Debit'}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${tx.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="text-sm max-w-xs truncate text-gray-700" title={tx.description}>
                      {tx.description || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
