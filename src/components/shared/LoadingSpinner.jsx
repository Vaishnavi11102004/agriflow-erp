import React from 'react';
import { Leaf } from 'lucide-react';

export default function LoadingSpinner({ fullHeight = false }) {
  return (
    <div className={`flex items-center justify-center z-50 ${fullHeight ? 'fixed inset-0 bg-white/80' : 'absolute inset-0'}`}>
      <div className="relative flex items-center justify-center">
        {/* The spinning border */}
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin absolute"></div>
        {/* The static central icon/logo */}
        <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center shadow-inner z-10">
          <Leaf size={16} />
        </div>
      </div>
    </div>
  );
}
