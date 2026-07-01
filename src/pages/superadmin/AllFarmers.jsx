import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api/axios';
import { Users, Search, MapPin, Eye, X, Phone, Mail, Calendar, Landmark, User, Shield } from 'lucide-react';

export default function AllFarmers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  const { data: farmers = [], isLoading: loading } = useQuery({
    queryKey: ['admin-farmers'],
    queryFn: async () => {
      const res = await api.get('/admin/farmers');
      return res.data;
    }
  });

  const filtered = farmers.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.phone.includes(search));
  const activeCount = farmers.filter(f => f.status === 'active').length;
  const pendingCount = farmers.filter(f => f.status === 'pending').length;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-3xl font-bold text-gray-900">{t("global_farmer_directory")}</h1><p className="text-gray-500 mt-1">{t("global_farmer_directory_desc")}</p></div>
        <div className="flex gap-4">
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-center shadow-sm"><p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t("active")}</p><p className="text-xl font-bold text-green-500">{activeCount}</p></div>
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-center shadow-sm"><p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t("pending")}</p><p className="text-xl font-bold text-yellow-500">{pendingCount}</p></div>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_by_name_phone")} className="input-field pl-11 py-3" />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("farmer_details")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("contact")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("location_land")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("status")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("joined_date")}</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t("view")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={6} className="text-center py-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">{t("no_farmers_found")}</td></tr>
                  : filtered.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-semibold text-gray-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 font-bold">{f.name?.[0]}</div>
                        {f.name}
                      </td>
                      <td className="p-4 text-gray-600"><p>{f.phone}</p><p className="text-xs text-gray-400">{f.email || t('no_email')}</p></td>
                      <td className="p-4 text-gray-600"><p className="flex items-center gap-1 text-sm"><MapPin size={14} className="text-gray-400"/>{f.address || 'Unknown'}</p><p className="text-xs text-primary-600 ml-5 font-semibold">{f.acres_of_land || 0} {t("acres")}</p></td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${f.status === 'active' ? 'bg-green-100 text-green-600' : f.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{t(f.status)}</span>
                      </td>
                      <td className="p-4 text-gray-500 text-sm">{new Date(f.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => setSelectedFarmer(f)} className="p-2 bg-gray-100 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"><Eye size={16} /></button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Farmer Detail Modal */}
      {selectedFarmer && (
        <div className="modal-overlay" onClick={() => setSelectedFarmer(null)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
                  {selectedFarmer.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{selectedFarmer.name}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${selectedFarmer.status === 'active' ? 'bg-green-100 text-green-600' : selectedFarmer.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {selectedFarmer.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedFarmer(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Phone size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('phone') || 'Phone'}</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedFarmer.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Mail size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('email') || 'Email'}</p>
                    <p className="text-sm font-semibold text-gray-800 break-all">{selectedFarmer.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('village') || 'Village / Address'}</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedFarmer.village || selectedFarmer.address || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Landmark size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('land_acres') || 'Land'}</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedFarmer.acres_of_land || selectedFarmer.land_acres || 0} Acres</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Shield size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('aadhaar') || 'Aadhaar'}</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedFarmer.aadhaar_number || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('joined_date') || 'Joined'}</p>
                    <p className="text-sm font-semibold text-gray-800">{new Date(selectedFarmer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
              {selectedFarmer.crops && selectedFarmer.crops.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">{t('crops') || 'Crops'}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFarmer.crops.map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-semibold">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setSelectedFarmer(null)} className="btn-ghost">{t('close') || 'Close'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
