import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import farmerService from '../../services/farmerService';
import { useAuth } from '../../context/AuthContext';
import { CACHE_TIMES } from '../../lib/queryConfig';
import { ShoppingCart, X, CheckCircle, Search, Tag, Filter, Download, Warehouse, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const GRAIN_PHOTOS = {
  Rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
  Wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400',
  Maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=400',
  Cotton: '/cotton-seeds.png',
  Sugarcane: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&q=80&w=400',
  Groundnut: 'https://images.unsplash.com/photo-1567892737950-30c4db37cd89?auto=format&fit=crop&q=80&w=400',
  default: 'https://images.unsplash.com/photo-1515942400420-2b98fed1f515?auto=format&fit=crop&q=80&w=400'
};

export default function SeedPurchase() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ quantity_kg: '', payment_method: 'upi', upi_id: '', transaction_id: '', warehouse_id: '' });
  const [saving, setSaving] = useState(false);
  const [upiTouched, setUpiTouched] = useState(false);
  const [upiSubmitError, setUpiSubmitError] = useState(false);
  const [tab, setTab] = useState('browse');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState(10000);
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceHtml, setInvoiceHtml] = useState('');
  const [qrTx, setQrTx] = useState(null);
  const [historyTimeFilter, setHistoryTimeFilter] = useState('all');

  const { data: seeds = [], isLoading: seedsLoading } = useQuery({
    queryKey: ['farmer-seeds'],
    queryFn: () => farmerService.getSeeds(),
    ...CACHE_TIMES.LONG
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['farmer-seed-purchases'],
    queryFn: () => farmerService.getSeedPurchases(user?.id),
    enabled: !!user?.id,
    ...CACHE_TIMES.MEDIUM
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['farmer-warehouses'],
    queryFn: () => farmerService.getWarehouses(),
    ...CACHE_TIMES.LONG
  });

  const loading = seedsLoading || purchasesLoading;

  const openBuy = (seed) => { setSelected(seed); setForm({ quantity_kg: '', payment_method: 'upi', upi_id: '', transaction_id: '', warehouse_id: '' }); setUpiTouched(false); setUpiSubmitError(false); setShowModal(true); };

  const quantityExceedsStock = selected && form.quantity_kg && parseFloat(form.quantity_kg) * 100 > selected.stock_kg;

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!form.quantity_kg || parseFloat(form.quantity_kg) <= 0) return toast.error(t('enter_valid_quantity'));
    if (parseFloat(form.quantity_kg) * 100 > selected.stock_kg) return toast.error(t('quantity_exceeds_stock', `Quantity exceeds available stock (${(selected.stock_kg / 100).toFixed(1)} Qtl)`));
    if (form.payment_method === 'upi') {
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(form.upi_id)) {
        setUpiSubmitError(true);
        return toast.error('Please enter a valid UPI ID');
      }
    }
    setSaving(true);
    try {
      const data = await farmerService.purchaseSeeds({
        farmer_id: user?.id,
        seed_id: selected.id,
        quantity_kg: parseFloat(form.quantity_kg) * 100,
        payment_method: form.payment_method,
        upi_id: form.payment_method === 'upi' ? form.upi_id : null,
        transaction_id: form.payment_method === 'upi' ? form.transaction_id : null,
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
      });
      // Build invoice HTML for modal display
      const invoiceData = { ...data, seed_name: selected.name, variety: selected.variety, price_per_kg: selected.price_per_kg, quantity_kg: parseFloat(form.quantity_kg) * 100 };
      setInvoiceHtml(generateInvoiceHtml(invoiceData));
      setShowModal(false);
      setShowInvoiceModal(true);
      queryClient.invalidateQueries({ queryKey: ['farmer-seeds'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-seed-purchases'] });
    } catch (err) {
      toast.error(err.message || t('purchase_failed'));
    }
    finally { setSaving(false); }
  };

  const generateInvoiceHtml = (p) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${p.invoice_number}</title>
    <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #1f2937; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .detail-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .value { font-size: 16px; font-weight: 600; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { text-align: left; padding: 12px; background: #f1f5f9; color: #475569; font-size: 13px; text-transform: uppercase; border-radius: 4px; }
        td { padding: 15px 12px; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
        .total-row { text-align: right; font-size: 20px; font-weight: bold; color: #16a34a; padding-top: 20px; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        .success-badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 6px 16px; border-radius: 999px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div style="text-align: center; margin-bottom: 20px;"><span class="success-badge">✅ Payment Successful</span></div>
    <div class="header">
        <div class="logo">🌱 AgriFlow</div>
        <div class="invoice-title">INVOICE</div>
    </div>
    <div class="details-grid">
        <div class="detail-box">
            <div class="label">Invoice Number</div>
            <div class="value">${p.invoice_number}</div>
            <div class="label" style="margin-top: 10px;">Date</div>
            <div class="value">${new Date().toLocaleString('en-IN')}</div>
        </div>
        <div class="detail-box">
            <div class="label">Payment Status</div>
            <div class="value" style="color: #16a34a;">Paid</div>
            <div class="label" style="margin-top: 10px;">Total Amount</div>
            <div class="value">₹${p.total_amount?.toLocaleString('en-IN') || (p.quantity_kg * p.price_per_kg).toLocaleString('en-IN')}</div>
        </div>
    </div>
    <table>
        <thead><tr><th>Seed Item</th><th>Quantity</th><th>Price/kg</th><th style="text-align: right;">Total Amount</th></tr></thead>
        <tbody>
            <tr>
                <td><strong>${p.seed_name}</strong><br><span style="color: #64748b; font-size: 13px;">Variety: ${p.variety || '-'}</span></td>
                <td>${(p.quantity_kg / 100.0).toFixed(2)} Qtl</td>
                <td>₹${p.price_per_kg * 100}/Qtl</td>
                <td style="text-align: right; font-weight: 600;">₹${(p.total_amount || (p.quantity_kg / 100.0) * (p.price_per_kg * 100)).toLocaleString('en-IN')}</td>
            </tr>
        </tbody>
    </table>
    <div class="total-row">Total Paid: ₹${(p.total_amount || p.quantity_kg * p.price_per_kg).toLocaleString('en-IN')}</div>
    <div class="footer">
        Thank you for choosing AgriFlow for your agricultural needs!<br>
        <small>This is a computer-generated invoice and requires no signature.</small>
    </div>
</body>
</html>`;

  const downloadInvoice = (p) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${p.invoice_number}</title>
    <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #1f2937; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .detail-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .value { font-size: 16px; font-weight: 600; color: #0f172a; }
        table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { text-align: left; padding: 12px; background: #f1f5f9; color: #475569; font-size: 13px; text-transform: uppercase; border-radius: 4px; }
        td { padding: 15px 12px; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
        .total-row { text-align: right; font-size: 20px; font-weight: bold; color: #16a34a; padding-top: 20px; }
        .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🌱 AgriFlow</div>
        <div class="invoice-title">INVOICE</div>
    </div>
    
    <div class="details-grid">
        <div class="detail-box">
            <div class="label">Invoice Number</div>
            <div class="value">${p.invoice_number}</div>
            <div class="label" style="margin-top: 10px;">Date</div>
            <div class="value">${new Date(p.created_at).toLocaleString('en-IN')}</div>
        </div>
        <div class="detail-box">
            <div class="label">Payment Status</div>
            <div class="value" style="color: ${p.payment_status === 'paid' ? '#16a34a' : '#ea580c'}; text-transform: capitalize;">${p.payment_status === 'pending' ? t('pay_at_warehouse') : p.payment_status}</div>
            <div class="label" style="margin-top: 10px;">Transaction ID</div>
            <div class="value">${p.transaction_id || '-'}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Seed Item</th>
                <th>Quantity</th>
                <th>Price/kg</th>
                <th style="text-align: right;">Total Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>${p.seed_name}</strong><br><span style="color: #64748b; font-size: 13px;">Variety: ${p.variety}</span></td>
                <td>${(p.quantity_kg / 100.0).toFixed(2)} Qtl</td>
                <td>₹${p.price_per_kg * 100}/Qtl</td>
                <td style="text-align: right; font-weight: 600;">₹${p.total_amount.toLocaleString('en-IN')}</td>
            </tr>
        </tbody>
    </table>

    <div class="total-row">
        Total Paid: ₹${p.total_amount.toLocaleString('en-IN')}
    </div>

    <div class="footer">
        Thank you for choosing AgriFlow for your agricultural needs!<br>
        <small>This is a computer-generated invoice and requires no signature.</small>
    </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Invoice_${p.invoice_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Derive filter data
  const maxPrice = seeds.length > 0 ? Math.ceil(Math.max(...seeds.map(s => s.price_per_kg))) : 1000;
  const cropTypes = [...new Set(seeds.map(s => s.name?.split(' ')[1] || s.name?.split(' ')[0] || 'default'))].filter(c => c !== 'default');

  // Filter logic
  const filtered = seeds.filter(s => {
    const cropName = s.name?.split(' ')[1] || s.name?.split(' ')[0] || 'default';
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.variety?.toLowerCase().includes(search.toLowerCase());
    const matchesCrop = selectedCrops.length === 0 || selectedCrops.includes(cropName);
    const matchesPrice = s.price_per_kg <= (maxPriceFilter === 10000 ? maxPrice : maxPriceFilter);
    const matchesStock = !inStockOnly || s.stock_kg > 0;
    const matchesWarehouse = !selectedWarehouse || String(s.warehouse_id) === selectedWarehouse;
    return matchesSearch && matchesCrop && matchesPrice && matchesStock && matchesWarehouse;
  });

  const total = form.quantity_kg && selected ? (parseFloat(form.quantity_kg) * 100 * selected.price_per_kg).toFixed(2) : '0.00';

  const filteredPurchases = purchases.filter(p => {
    if (historyTimeFilter === 'all') return true;
    const diffDays = Math.ceil(Math.abs(new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24));
    if (historyTimeFilter === '1week') return diffDays <= 7;
    if (historyTimeFilter === '1month') return diffDays <= 30;
    if (historyTimeFilter === '6weeks') return diffDays <= 42;
    if (historyTimeFilter === '3months') return diffDays <= 90;
    if (historyTimeFilter === '6months') return diffDays <= 180;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">{t('seed_purchase')}</h1><p className="page-subtitle">{t('seed_purchase_desc')}</p></div>
      </div>

      <div className="tab-nav">
        <button className={`tab-btn ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>{t('browse_seeds')}</button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>{t('purchase_history')} ({purchases.length})</button>
      </div>

      {tab === 'browse' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-2">
            <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost flex items-center gap-2">
              <Filter size={18} /> {t('filters')}
            </button>
          </div>

          {/* Sidebar Filters */}
          <div className={`lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="glass-card p-5 space-y-6 sticky top-20">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">{t('filters')}</h3>
                <button onClick={() => { setMaxPriceFilter(10000); setSelectedCrops([]); setInStockOnly(false); setSelectedWarehouse(''); }} className="text-xs text-primary-600 hover:underline">
                  {t('clear_all')}
                </button>
              </div>

              {/* Price Filter */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('price_range')}</h4>
                <div className="space-y-4">
                  <input type="range" min="1" max={maxPrice}
                    value={maxPriceFilter === 10000 ? maxPrice : maxPriceFilter}
                    onChange={e => setMaxPriceFilter(Number(e.target.value))}
                    className="w-full accent-primary-600" />
                  <div className="flex justify-between text-xs text-gray-500 font-medium">
                    <span>₹0</span>
                    <span>₹{maxPriceFilter === 10000 ? maxPrice : maxPriceFilter}</span>
                  </div>
                </div>
              </div>

              {/* Crop Type Filter */}
              {cropTypes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('crop_type')}</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {cropTypes.map(crop => (
                      <label key={crop} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox"
                          checked={selectedCrops.includes(crop)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCrops([...selectedCrops, crop]);
                            else setSelectedCrops(selectedCrops.filter(c => c !== crop));
                          }}
                          className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 transition-colors cursor-pointer" />
                        <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">{crop}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Warehouse Filter */}
              {warehouses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('warehouse', 'Warehouse')}</h4>
                  <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}
                    className="input-field text-sm">
                    <option value="">{t('all_warehouses', 'All Warehouses')}</option>
                    {warehouses.filter(w => seeds.some(s => String(s.warehouse_id) === String(w.id))).map(w => (
                      <option key={w.id} value={String(w.id)}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Availability Filter */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('availability') || 'Availability'}</h4>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 transition-colors cursor-pointer" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">{t('in_stock_only')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Main Content (Grid & Search) */}
          <div className="flex-1">
            <div className="relative mb-6">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search_seeds_placeholder')} className="input-field pl-10" />
            </div>

            {filtered.length === 0 ? (
              <div className="glass-card p-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Search size={24} className="text-gray-400" /></div>
                <h3 className="font-bold text-gray-800 mb-2">{t('no_seeds_found')}</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">{t('adjust_filters_desc')}</p>
                <button onClick={() => { setMaxPriceFilter(10000); setSelectedCrops([]); setInStockOnly(false); setSelectedWarehouse(''); setSearch(''); }} className="btn-ghost mt-4">
                  {t('clear_all_filters')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
                {filtered.map(seed => {
                  const cropName = seed.name?.split(' ')[1] || seed.name?.split(' ')[0] || 'default';
                  const photoUrl = seed.image_url || GRAIN_PHOTOS[cropName] || GRAIN_PHOTOS.default;
                  return (
                    <div key={seed.id} className="glass-card overflow-hidden hover-lift flex flex-col group">
                      <div className="h-24 sm:h-32 bg-gray-100 overflow-hidden relative">
                        <img src={photoUrl} alt={seed.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="p-3 sm:p-5 flex flex-col flex-1">
                        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-1 sm:gap-2 mb-2 sm:mb-3">
                          <div>
                            <h3 className="font-bold text-gray-800 leading-tight text-xs sm:text-base">{seed.name}</h3>
                            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{seed.variety}</p>
                          </div>
                          <span className="text-[10px] sm:text-xs font-semibold text-primary-700 bg-primary-50 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">{t('in_stock')}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-4 flex-1 leading-relaxed line-clamp-2">{seed.description}</p>
                        <div className="flex items-center gap-1 mb-2 sm:mb-3">
                          <Warehouse size={12} className="text-gray-400 shrink-0" />
                          {seed.warehouses?.length > 0 ? (
                            <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate">{seed.warehouses.map(w => w.name).join(', ')}</span>
                          ) : (
                            <span className="text-[10px] sm:text-xs italic text-gray-400">{t('warehouse_not_assigned', 'Warehouse not assigned')}</span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-4 gap-1">
                          <div>
                            <p className="text-lg sm:text-2xl font-bold text-agro-green">₹{seed.price_per_kg * 100}<span className="text-[10px] sm:text-sm text-gray-400 font-normal">/Qtl</span></p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">{t('available')}</p>
                            <p className="text-[10px] sm:text-sm font-semibold text-gray-700">{(seed.stock_kg / 100).toLocaleString('en-IN')} Qtl left</p>
                            {Number(seed.on_hold_kg) > 0 && (
                              <p className="text-[9px] sm:text-[10px] font-medium text-amber-600 mt-0.5">
                                ON HOLD: {(Number(seed.on_hold_kg) / 100).toLocaleString('en-IN')} Qtl
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-1 sm:h-1.5 bg-gray-200 rounded-full mb-3 sm:mb-4 overflow-hidden">
                          <div className={`h-full rounded-full ${seed.stock_kg > 1000 ? 'bg-green-500' : seed.stock_kg > 500 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(100, (seed.stock_kg / 5000) * 100)}%` }} />
                        </div>
                        <button onClick={() => openBuy(seed)} disabled={seed.stock_kg <= 0}
                          className="btn-primary py-1.5 sm:py-2 flex items-center justify-center gap-1 sm:gap-2 mt-auto text-[10px] sm:text-sm">
                          <ShoppingCart size={14} className="hidden sm:inline" />{seed.stock_kg > 0 ? t('purchase') : t('out_of_stock')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <h3 className="font-bold text-gray-800">{t('purchase_history')}</h3>
            <select value={historyTimeFilter} onChange={e => setHistoryTimeFilter(e.target.value)} className="input-field max-w-xs text-sm py-2">
              <option value="all">{t('all_time', 'All Time')}</option>
              <option value="1week">{t('last_1_week', 'Last 1 Week')}</option>
              <option value="1month">{t('last_1_month', 'Last 1 Month')}</option>
              <option value="6weeks">{t('last_6_weeks', 'Last 6 Weeks')}</option>
              <option value="3months">{t('last_3_months', 'Last 3 Months')}</option>
              <option value="6months">{t('last_6_months', 'Last 6 Months')}</option>
            </select>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filteredPurchases.length === 0
              ? <p className="text-center py-10 text-gray-400 text-sm">{t('no_purchases_found', 'No purchases found.')}</p>
              : filteredPurchases.map(p => (
                <button key={p.id} onClick={() => setSelectedPurchase(p)} className="w-full text-left p-4 space-y-1 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div><p className="font-semibold text-gray-800">{p.seed_name}</p><p className="text-xs text-gray-400">{p.variety}</p></div>
                    <span className={`badge ${p.payment_status === 'paid' ? 'badge-green' : p.payment_status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>{p.payment_status === 'pending' ? t('pay_at_warehouse') : p.payment_status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{(p.quantity_kg / 100).toFixed(2)} Qtl</span>
                    <span className="font-bold text-gray-800">₹{p.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('en-IN')}</span>
                </button>
              ))
            }
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block table-container">
            <table className="data-table">
              <thead><tr>
                <th>{t('seed_name')}</th><th>{t('quantity')}</th><th>{t('price_per_kg')}</th><th>{t('total_amount')}</th>
                <th>{t('upi_id')}</th><th>{t('transaction_id')}</th><th>{t('invoice')}</th><th>{t('status')}</th><th>{t('date')}</th><th>QR</th>
              </tr></thead>
              <tbody>
                {filteredPurchases.length === 0
                  ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">{t('no_purchases_found', 'No purchases found in this period.')}</td></tr>
                  : filteredPurchases.map(p => (
                    <tr key={p.id}>
                      <td><p className="font-semibold">{p.seed_name}</p><p className="text-xs text-gray-400">{p.variety}</p></td>
                      <td>{(p.quantity_kg / 100).toFixed(2)} Qtl</td>
                      <td>₹{p.price_per_kg}</td>
                      <td className="font-bold text-gray-800">₹{p.total_amount.toLocaleString('en-IN')}</td>
                      <td className="text-xs">{p.upi_id || '-'}</td>
                      <td className="text-xs">{p.transaction_id || '-'}</td>
                      <td>{p.invoice_number ? (
                        <button onClick={() => downloadInvoice(p)} className="badge-blue text-[10px] flex items-center gap-1 hover:bg-blue-200 transition-colors">
                          {p.invoice_number} <Download size={10} />
                        </button>
                      ) : '-'}</td>
                      <td>
                        <span className={`badge ${p.payment_status === 'paid' ? 'badge-green' : p.payment_status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>
                          {p.payment_status === 'pending' ? t('pay_at_warehouse') : p.payment_status}
                        </span>
                      </td>
                      <td className="text-xs">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <button onClick={() => setQrTx(p)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors" title="View QR"><QrCode size={14} /></button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showModal && selected && (
        <div className="modal-overlay items-start pt-4 sm:items-center sm:pt-0" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-xl">🌱</div>
                <div><h3 className="font-bold text-gray-800">{t('purchase')} {selected.name}</h3><p className="text-xs text-gray-500">₹{selected.price_per_kg * 100}/Qtl</p></div>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handlePurchase} className="modal-body space-y-4">
              <div>
                <label className="label">{t('quantity_qtl', 'Quantity (Quintals)')} *</label>
                <input type="number" value={form.quantity_kg} onChange={e => setForm(f => ({ ...f, quantity_kg: e.target.value }))}
                  className={`input-field ${quantityExceedsStock ? 'border-red-400 ring-1 ring-red-400' : ''}`} placeholder={t('quantity_qtl_placeholder', 'Enter quantity in Quintals')} min="0.1" max={selected.stock_kg / 100} step="0.1" required />
                <p className={`text-xs mt-1 ${quantityExceedsStock ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {quantityExceedsStock ? `⚠ ${t('quantity_exceeds_stock', 'Quantity exceeds available stock!')} ` : ''}{t('max_available')}: {(selected.stock_kg / 100).toFixed(1)} Qtl
                </p>
              </div>
              {form.quantity_kg && !quantityExceedsStock && (
                <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-sm font-semibold text-gray-700">{t('order_summary')}</p>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-gray-500">{form.quantity_kg} Qtl × ₹{selected.price_per_kg * 100}/Qtl</span>
                    <span className="font-bold text-agro-green text-lg">₹{total}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="label">{t('payment_method')}</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <label className={`border rounded-xl p-3 flex items-center gap-2 cursor-pointer transition-all ${form.payment_method === 'upi' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="payment_method" value="upi" checked={form.payment_method === 'upi'} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-gray-800">{t('pay_now_upi')}</span>
                  </label>
                  <label className={`border rounded-xl p-3 flex items-center gap-2 cursor-pointer transition-all ${form.payment_method === 'warehouse' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="payment_method" value="warehouse" checked={form.payment_method === 'warehouse'} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="text-amber-600 focus:ring-amber-500" />
                    <span className="text-sm font-medium text-gray-800">{t('pay_at_warehouse')}</span>
                  </label>
                </div>
                {form.payment_method === 'warehouse' && (
                  <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded-lg mt-2 font-medium">
                    {t('warehouse_payment_warning')}
                  </p>
                )}
              </div>

              <div>
                <label className="label">{t('warehouse')} *</label>
                {selected.warehouses?.length > 0 ? (
                  <select value={form.warehouse_id || ''} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} className="input-field" required>
                    <option value="">{t('select_warehouse', 'Select Warehouse')}</option>
                    {selected.warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <select value={form.warehouse_id || ''} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} className="input-field">
                      <option value="">{t('select_warehouse', 'Select Warehouse')}</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-amber-600 mt-1">{t('warehouse_not_assigned_hint', 'No warehouse assigned yet — pick one for pickup.')}</p>
                  </>
                )}
                <p className="text-xs text-gray-400 mt-1">{t('seed_stocked_at_hint', "This is where this seed's stock is kept.")}</p>
              </div>

              {form.payment_method === 'upi' && form.quantity_kg && !quantityExceedsStock && (
                <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">Scan to Pay ₹{total}</p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=agriflow@upi%26pn=AgriFlow%26am=${total}%26tn=${encodeURIComponent('Seed Purchase: ' + (selected?.name || ''))}`}
                    alt="UPI QR" className="w-32 h-32 rounded-lg"
                  />
                  <p className="text-[10px] text-gray-400">Demo QR — for reference only</p>
                </div>
              )}
              {form.payment_method === 'upi' && (
                <div>
                  <label className="label">{t('upi_id')} *</label>
                  <input
                    value={form.upi_id}
                    onChange={e => { setForm(f => ({ ...f, upi_id: e.target.value })); setUpiTouched(true); setUpiSubmitError(false); }}
                    className="input-field"
                    placeholder="farmer@upi"
                  />
                  {(upiSubmitError || (upiTouched && form.upi_id && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(form.upi_id))) && (
                    <p className="mt-1 text-xs text-red-500">Please enter a valid UPI ID</p>
                  )}
                </div>
              )}
            </form>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handlePurchase} disabled={saving || quantityExceedsStock} className={`btn-primary flex items-center gap-2 ${quantityExceedsStock ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {saving ? t('processing') : `${t('confirm_purchase')} ₹${total}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrTx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setQrTx(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Payment QR</h3>
              <button onClick={() => setQrTx(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center gap-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=agriflow@upi%26pn=AgriFlow%26am=${qrTx.total_amount}%26tn=${encodeURIComponent('Seed: ' + (qrTx.seed_name || ''))}`}
                alt="Payment QR" className="w-44 h-44 rounded-lg"
              />
              <p className="text-xs text-gray-500">Scan with any UPI app</p>
              <p className="text-lg font-black text-primary-700">₹{parseFloat(qrTx.total_amount).toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400 truncate max-w-full">{qrTx.seed_name}</p>
            </div>
            <p className="text-[10px] text-gray-400">Demo QR — for reference only</p>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="modal-overlay items-start pt-4 sm:items-center sm:pt-0" style={{ zIndex: 9999 }} onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{t('payment_successful', 'Payment Successful!')}</h3>
                  <p className="text-xs text-gray-500">{t('invoice_generated', 'Your invoice has been generated')}</p>
                </div>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              <iframe
                srcDoc={invoiceHtml}
                title="Invoice"
                className="w-full border-0 rounded-xl"
                style={{ minHeight: '600px', height: '100%' }}
              />
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
              <button onClick={() => {
                const blob = new Blob([invoiceHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'invoice.html';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }} className="btn-ghost flex items-center gap-2">
                <Download size={16} /> {t('download', 'Download')}
              </button>
              <button onClick={() => setShowInvoiceModal(false)} className="btn-primary">{t('done', 'Done')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile purchase detail modal */}
      {selectedPurchase && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setSelectedPurchase(null)}>
          <div className="bg-white w-full rounded-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{t('purchase_details', 'Purchase Details')}</h3>
              <button onClick={() => setSelectedPurchase(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-800">{selectedPurchase.seed_name}</p>
                <p className="text-xs text-gray-400">{selectedPurchase.variety}</p>
              </div>
              <span className={`badge ${selectedPurchase.payment_status === 'paid' ? 'badge-green' : selectedPurchase.payment_status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>
                {selectedPurchase.payment_status === 'pending' ? t('pay_at_warehouse') : selectedPurchase.payment_status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              {[
                [t('quantity'), `${(selectedPurchase.quantity_kg / 100).toFixed(2)} Qtl`],
                [t('price_per_kg'), `₹${selectedPurchase.price_per_kg}`],
                [t('total_amount'), `₹${parseFloat(selectedPurchase.total_amount).toLocaleString('en-IN')}`],
                [t('date'), new Date(selectedPurchase.created_at).toLocaleString('en-IN')],
                [t('upi_id'), selectedPurchase.upi_id || '-'],
                [t('transaction_id'), selectedPurchase.transaction_id || '-'],
                [t('invoice'), selectedPurchase.invoice_number || '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-400 text-xs font-medium shrink-0">{label}</span>
                  <span className="text-gray-800 font-semibold text-xs text-right break-all">{value}</span>
                </div>
              ))}
            </div>
            {selectedPurchase.invoice_number && (
              <button onClick={() => downloadInvoice(selectedPurchase)} className="w-full btn-primary flex items-center justify-center gap-2">
                <Download size={15} /> {t('download_invoice', 'Download Invoice')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
