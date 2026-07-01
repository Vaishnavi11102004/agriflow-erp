import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Package, Truck, Search, CheckCircle, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api/axios';

const MOCK_DISTRIBUTORS = [
  { id: 1, name: 'ITC Limited (Agri Business)', location: 'Hyderabad, TS', contract: 'Active', capacity: '50,000 MT' },
  { id: 2, name: 'Cargill India', location: 'Vijayawada, AP', contract: 'Active', capacity: '120,000 MT' },
  { id: 3, name: 'Reliance Fresh Direct', location: 'Bengaluru, KA', contract: 'Pending', capacity: '25,000 MT' },
  { id: 4, name: 'Adani Agri Logistics', location: 'Nagpur, MH', contract: 'Active', capacity: '200,000 MT' }
];

export default function Distributors() {
  const { t } = useTranslation();
  const [selectedDist, setSelectedDist] = useState(null);
  const [dispatchData, setDispatchData] = useState({ warehouse_id: '', grain_type: '', quantity: '' });

  const { data: warehouses = [], isLoading: loading } = useQuery({
    queryKey: ['admin-warehouses'],
    queryFn: async () => {
      const res = await api.get('/admin/warehouses');
      return res.data;
    }
  });

  const handleDispatch = (e) => {
    e.preventDefault();
    if (!dispatchData.warehouse_id || !dispatchData.grain_type || !dispatchData.quantity) {
      toast.error(t('fill_all_details'));
      return;
    }
    // Simulate dispatch
    toast.success(t('dispatch_success', { quantity: dispatchData.quantity, grain: dispatchData.grain_type, name: selectedDist.name }));
    setSelectedDist(null);
    setDispatchData({ warehouse_id: '', grain_type: '', quantity: '' });
  };

  const getInventoryForSelectedWarehouse = () => {
    const wh = warehouses.find(w => w.id.toString() === dispatchData.warehouse_id);
    return wh ? wh.inventory : [];
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("distributors_management")}</h1>
          <p className="page-subtitle">{t("distributors_desc")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-gray-800 text-lg mb-3">{t("registered_distributors")}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {MOCK_DISTRIBUTORS.map(d => (
              <div key={d.id} className={`glass-card p-5 cursor-pointer transition-all ${selectedDist?.id === d.id ? 'border-2 border-emerald-500 shadow-md' : 'hover:-translate-y-1'}`}
                onClick={() => setSelectedDist(d)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white mb-2 shadow-md">
                    <Truck size={20} />
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${d.contract === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {d.contract}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-lg">{d.name}</h4>
                <p className="text-gray-500 text-sm flex items-center gap-1 mb-2"><Navigation size={12} /> {d.location}</p>
                <div className="bg-gray-50 rounded-lg p-2 text-center mt-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t("buying_capacity")}</p>
                  <p className="text-emerald-700 font-bold">{d.capacity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {selectedDist ? (
            <div className="glass-card p-6 sticky top-4 border-t-4 border-emerald-500">
              <h3 className="font-bold text-gray-900 text-xl mb-1">{t("dispatch_grains")}</h3>
              <p className="text-sm text-gray-500 mb-6">{t("selling_to")} <span className="font-semibold text-emerald-700">{selectedDist.name}</span></p>

              <form onSubmit={handleDispatch} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t("select_source_warehouse")}</label>
                  <select className="input-field bg-white" required value={dispatchData.warehouse_id} onChange={e => setDispatchData({...dispatchData, warehouse_id: e.target.value, grain_type: ''})}>
                    <option value="">-- {t("select_warehouse")} --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.current_load_kg} kg available)</option>
                    ))}
                  </select>
                </div>

                {dispatchData.warehouse_id && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{t("select_grain_type")}</label>
                    <select className="input-field bg-white" required value={dispatchData.grain_type} onChange={e => setDispatchData({...dispatchData, grain_type: e.target.value})}>
                      <option value="">-- {t("select_grain")} --</option>
                      {getInventoryForSelectedWarehouse().filter(i => i.quantity_kg > 0).map(i => (
                        <option key={i.grain_type} value={i.grain_type}>{i.grain_type} (Stock: {i.quantity_kg} kg)</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t("dispatch_quantity_kg")}</label>
                  <input type="number" min="1" className="input-field bg-white" placeholder={t("enter_quantity")} required
                    value={dispatchData.quantity} onChange={e => setDispatchData({...dispatchData, quantity: e.target.value})} />
                </div>

                <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-2 shadow-md">
                  <Package size={18} /> {t("confirm_dispatch")}
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-card p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px] border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4">
                <Truck size={30} />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">{t("ready_for_dispatch")}</h3>
              <p className="text-gray-500 text-sm">{t("select_distributor_desc")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
