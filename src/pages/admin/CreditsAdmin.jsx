import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ledgerService from '../../services/ledgerService';
import adminService from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { Search, DollarSign, Plus, X, UserPlus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreditsAdmin() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, credit, debit

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => ledgerService.getTransactions()
  });

  const { data: farmers = [] } = useQuery({
    queryKey: ['admin-farmers'],
    queryFn: () => adminService.getFarmers()
  });

  // Add/Edit Entry modal (shared — editingTx is null when adding)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [entryForm, setEntryForm] = useState({ amount: '', direction: 'credit', status: 'completed', description: '', date: '' });
  const [saving, setSaving] = useState(false);

  const farmerMatches = useMemo(() => {
    if (!farmerSearch.trim()) return [];
    const q = farmerSearch.toLowerCase();
    return farmers.filter(f => f.name?.toLowerCase().includes(q) || f.phone?.includes(q)).slice(0, 8);
  }, [farmerSearch, farmers]);

  const openAddModal = () => {
    setEditingTx(null);
    setSelectedFarmer(null);
    setFarmerSearch('');
    setEntryForm({ amount: '', direction: 'credit', status: 'completed', description: '', date: new Date().toISOString().split('T')[0] });
    setShowAddModal(true);
  };

  const openEditModal = (tx) => {
    setEditingTx(tx);
    setSelectedFarmer({ id: tx.farmer_id, name: tx.farmer_name, phone: tx.phone, status: '' });
    setFarmerSearch('');
    setEntryForm({
      amount: tx.amount || '',
      direction: tx.direction,
      status: tx.status,
      description: tx.description || '',
      date: tx.created_at ? new Date(tx.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowAddModal(true);
  };

  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    if (!selectedFarmer) return toast.error('Please select a farmer');
    if (!entryForm.amount || parseFloat(entryForm.amount) <= 0) return toast.error('Enter a valid amount');

    setSaving(true);
    try {
      if (editingTx) {
        await ledgerService.updateTransaction(editingTx.id, {
          farmer_id: selectedFarmer.id,
          amount: entryForm.amount,
          direction: entryForm.direction,
          status: entryForm.status,
          description: entryForm.description,
          created_at: entryForm.date ? new Date(entryForm.date).toISOString() : undefined,
        }, user?.id);
        toast.success('Credit entry updated');
      } else {
        await ledgerService.createTransaction({
          farmer_id: selectedFarmer.id,
          farmer_name: selectedFarmer.name,
          amount: entryForm.amount,
          direction: entryForm.direction,
          status: entryForm.status,
          description: entryForm.description,
        }, user?.id);
        toast.success('Credit entry added');
      }
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
    } catch (err) {
      toast.error(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex items-center gap-3">
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Entry
          </button>
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
            <DollarSign size={24} className="text-green-600" />
          </div>
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
        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-gray-400 text-sm">No transactions found.</p>
          ) : (
            filtered.map(tx => (
              <div key={tx.id} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-800">{tx.farmer_name}</div>
                    <div className="text-xs text-gray-500">{tx.phone}</div>
                  </div>
                  <div className={`font-bold ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.direction === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  {tx.description || '-'}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 text-[10px] font-semibold rounded ${tx.direction === 'credit' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {tx.direction === 'credit' ? 'Credit' : 'Debit'}
                    </span>
                    <span className={`px-2 py-1 text-[10px] font-semibold rounded ${tx.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <button onClick={() => openEditModal(tx)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-primary-600 transition-colors" title="Edit entry">
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Farmer</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th>Reason / Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">No transactions found.</td>
                </tr>
              ) : (
                filtered.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-sm">{new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
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
                    <td>
                      <button onClick={() => openEditModal(tx)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-primary-600 transition-colors" title="Edit entry">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTx ? 'Edit Credit Entry' : 'Add Credit Entry'}</h3>
              <button onClick={() => setShowAddModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitEntry}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="label">Farmer *</label>
                  {selectedFarmer ? (
                    <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-xl">
                      <div>
                        <p className="font-semibold text-gray-800">{selectedFarmer.name}</p>
                        <p className="text-xs text-gray-500">{selectedFarmer.phone} · {selectedFarmer.status}</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedFarmer(null); setFarmerSearch(''); }} className="text-xs text-red-500 font-medium hover:underline">Change</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={farmerSearch}
                        onChange={e => setFarmerSearch(e.target.value)}
                        placeholder="Search farmer by name or phone…"
                        className="input-field pl-9"
                        autoFocus
                      />
                      {farmerSearch.trim() && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {farmerMatches.length > 0 ? farmerMatches.map(f => (
                            <button
                              type="button"
                              key={f.id}
                              onClick={() => { setSelectedFarmer(f); setFarmerSearch(''); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                            >
                              <p className="text-sm font-medium text-gray-800">{f.name}</p>
                              <p className="text-xs text-gray-500">{f.phone} · {f.status}</p>
                            </button>
                          )) : (
                            <div className="px-4 py-4 text-center">
                              <p className="text-sm text-gray-500 mb-2">No matching farmer found.</p>
                              <button
                                type="button"
                                onClick={() => { setShowAddModal(false); navigate('/manager/dashboard/farmers'); }}
                                className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1 justify-center w-full"
                              >
                                <UserPlus size={13} /> Register a new farmer first
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Amount (₹) *</label>
                    <input type="number" min="0.01" step="0.01" value={entryForm.amount} onChange={e => setEntryForm(f => ({ ...f, amount: e.target.value }))} className="input-field" placeholder="e.g. 5000" required />
                  </div>
                  <div>
                    <label className="label">Type *</label>
                    <select value={entryForm.direction} onChange={e => setEntryForm(f => ({ ...f, direction: e.target.value }))} className="input-field">
                      <option value="credit">Credit (pay farmer)</option>
                      <option value="debit">Debit (deduct)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Status</label>
                    <select value={entryForm.status} onChange={e => setEntryForm(f => ({ ...f, status: e.target.value }))} className="input-field">
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Date</label>
                    <input type="date" value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="label">Reason / Description</label>
                  <input value={entryForm.description} onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="e.g. Manual adjustment for bonus payment" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingTx ? <Pencil size={16} /> : <Plus size={16} />)}
                  {saving ? 'Saving...' : (editingTx ? 'Save Changes' : 'Add Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
