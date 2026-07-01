import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { Users, Search, Eye, Check, X, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FarmersDirectory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { data: farmers = [], isLoading: loading } = useQuery({
    queryKey: ['admin-farmers'],
    queryFn: async () => {
      const res = await api.get('/admin/farmers');
      return res.data;
    }
  });

  const loadDetail = async (id) => {
    setDetailLoading(true);
    const { data } = await api.get(`/admin/farmers/${id}`);
    setDetail(data); setDetailLoading(false);
  };

  const handleAction = async (id, status) => {
    try {
      await api.patch(`/admin/farmers/${id}/approve`, { status });
      toast.success(t('farmer') + ' ' + status);
      queryClient.invalidateQueries({ queryKey: ['admin-farmers'] });
      if (selected === id) setDetail(d => ({ ...d, farmer: { ...d.farmer, status } }));
    } catch { toast.error(t('action_failed')); }
  };

  const filtered = farmers.filter(f => {
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.phone.includes(search);
    return matchStatus && matchSearch;
  });

  const statusBadge = (s) => ({ active: 'badge-green', pending: 'badge-yellow', rejected: 'badge-red' }[s] || 'badge-gray');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('farmers')}</h1><p className="page-subtitle">{t("manage_farmers_desc")}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_by_name_phone")} className="input-field pl-10" />
        </div>
        <div className="tab-nav mb-0 flex-shrink-0">
          {['all', 'pending', 'active', 'rejected'].map(s => (
            <button key={s} className={`tab-btn capitalize ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{t(s)}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Table */}
        <div className={`glass-card overflow-hidden flex-1 ${selected ? 'hidden xl:block' : ''}`}>
          <div className="table-container">
            <table className="data-table">
              <thead><tr>
                <th>{t("farmer")}</th><th>{t("phone")}</th><th>{t("address")}</th><th>{t("acres")}</th><th>{t("status")}</th><th>{t("registered")}</th><th>{t("actions")}</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></td></tr>
                  : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">{t("no_farmers_found")}</td></tr>
                    : filtered.map(f => (
                      <tr key={f.id} className={`cursor-pointer ${selected === f.id ? 'bg-primary-50' : ''}`} onClick={() => { setSelected(f.id); loadDetail(f.id); }}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">{f.name?.[0]}</div>
                            <span className="font-semibold text-gray-800">{f.name}</span>
                          </div>
                        </td>
                        <td>{f.phone}</td>
                        <td className="text-xs max-w-[120px] truncate">{f.address || '-'}</td>
                        <td>{f.acres_of_land || '-'}</td>
                        <td><span className={`badge ${statusBadge(f.status)}`}>{t(f.status)}</span></td>
                        <td className="text-xs">
                          {(() => {
                            const raw = f.status === 'active' ? (f.verified_at || f.created_at) : f.created_at;
                            const d = new Date(raw);
                            return isNaN(d) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                          })()}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {f.status === 'pending' && (
                              <>
                                <button onClick={e => { e.stopPropagation(); handleAction(f.id, 'active'); }}
                                  className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title={t('approve')}>
                                  <Check size={14} />
                                </button>
                                <button onClick={e => { e.stopPropagation(); handleAction(f.id, 'rejected'); }}
                                  className="p-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors" title={t('reject')}>
                                  <X size={14} />
                                </button>
                              </>
                            )}
                            <button onClick={e => { e.stopPropagation(); setSelected(f.id); loadDetail(f.id); }} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"><Eye size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-full xl:w-80 flex-shrink-0">
            <div className="glass-card p-5 sticky top-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">{t("farmer_details")}</h3>
                <button onClick={() => { setSelected(null); setDetail(null); }} className="btn-icon"><X size={16} /></button>
              </div>
              {detailLoading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
                : detail && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                        {detail.farmer.name?.[0]}
                      </div>
                      <h4 className="font-bold text-gray-900">{detail.farmer.name}</h4>
                      <p className="text-gray-500 text-sm">{detail.farmer.phone}</p>
                      <span className={`badge ${statusBadge(detail.farmer.status)} mt-1`}>{t(detail.farmer.status)}</span>
                    </div>
                    {detail.farmer.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(detail.farmer.id, 'active')} className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1"><Check size={14} />{t("approve")}</button>
                        <button onClick={() => handleAction(detail.farmer.id, 'rejected')} className="btn-danger flex-1 py-2 text-xs flex items-center justify-center gap-1"><X size={14} />{t("reject")}</button>
                      </div>
                    )}
                    <div className="space-y-2 text-sm">
                      {[
                        [t('address'), detail.farmer.address],
                        [t('acres'), detail.farmer.acres_of_land],
                        [t('farm_location'), detail.farmer.crop_address],
                        [t('bank_status'), detail.farmer.bank_status],
                      ].map(([k, v]) => v && (
                        <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                          <span className="text-gray-400 text-xs">{k}</span>
                          <span className="text-gray-700 text-xs font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="bg-primary-50 rounded-xl p-2"><p className="text-lg font-bold text-primary-700">{detail.crops?.length || 0}</p><p className="text-[10px] text-gray-500">{t("crops")}</p></div>
                      <div className="bg-green-50 rounded-xl p-2"><p className="text-lg font-bold text-green-700">{detail.transactions?.length || 0}</p><p className="text-[10px] text-gray-500">{t("txns")}</p></div>
                      <div className="bg-amber-50 rounded-xl p-2"><p className="text-lg font-bold text-amber-700">{detail.grainSales?.length || 0}</p><p className="text-[10px] text-gray-500">{t("sales")}</p></div>
                    </div>
                    {detail.transactions?.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <h5 className="text-xs font-bold text-gray-700 mb-2">{t("past_transactions")}</h5>
                        <div className="max-h-48 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                          {detail.transactions.map(tx => (
                            <div key={tx.id} className="bg-gray-50 p-2 rounded-lg flex justify-between items-center">
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="text-[11px] text-gray-800 font-medium truncate">{tx.description}</p>
                                <p className="text-[9px] text-gray-400">{new Date(tx.created_at * 1000).toLocaleDateString('en-IN')}</p>
                              </div>
                              <span className={`text-xs font-bold whitespace-nowrap ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                                {tx.direction === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
