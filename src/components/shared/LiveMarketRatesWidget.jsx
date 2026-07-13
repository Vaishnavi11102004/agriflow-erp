import React, { useState } from 'react';
import { TrendingUp, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import marketService from '../../services/marketService';

export default function LiveMarketRatesWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: marketRates = [], isLoading } = useQuery({
    queryKey: ['admin-market-rates-widget'],
    queryFn: () => marketService.getRates(),
    refetchInterval: 30000,
  });

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[9999] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 origin-bottom-right">
          <div className="bg-gradient-to-r from-primary-600 to-green-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <TrendingUp size={18} className="animate-pulse" /> Live Market Rates
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto p-4 bg-gray-50/50 custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
            ) : marketRates.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">No rates available right now.</p>
            ) : (
              <div className="space-y-3">
                {marketRates.map((rate, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-primary-200 transition-colors">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{rate.crop_type}</p>
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">Grade {rate.grade}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">₹{rate.price_per_kg}</p>
                      <p className="text-[10px] text-gray-400">per kg</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-gray-50 p-2 text-center border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-medium">Updated in real-time</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-primary-600 to-green-600 rounded-full flex items-center justify-center text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
      >
        {isOpen ? <ChevronDown size={24} /> : <TrendingUp size={24} />}
      </button>
    </div>
  );
}
