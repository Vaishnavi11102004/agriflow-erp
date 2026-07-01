import React from 'react';
import { getRateLimitStatus, clearRateLimits } from '../utils/rateLimiter';
import { useRateLimit } from '../hooks/useRateLimit';

/**
 * Component to display current rate limit status (for debugging/admin)
 */
export function RateLimitStatus() {
  const status = getRateLimitStatus();
  const { resetRateLimit } = useRateLimit({ showToast: false });

  const getPercentage = (used, max) => {
    return Math.round((used / max) * 100);
  };

  const getColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Rate Limit Status</h2>
        <button
          onClick={resetRateLimit}
          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(status).map(([category, info]) => (
          <div key={category} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-700 capitalize">{category}</span>
              <span className="text-sm text-gray-500">
                {info.remaining} / {info.max} remaining
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className={`${getColor(getPercentage(info.used, info.max))} h-2.5 rounded-full transition-all`}
                style={{ width: `${getPercentage(info.used, info.max)}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{info.used} used</span>
              <span>Resets in {info.resetIn}s</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
        <strong>Note:</strong> This panel shows client-side rate limit tracking. 
        Server-side limits may differ.
      </div>
    </div>
  );
}

/**
 * Simple rate limit indicator (for header/nav)
 */
export function RateLimitIndicator() {
  const status = getRateLimitStatus();
  const globalStatus = status.global;
  const percentage = getPercentage(globalStatus.used, globalStatus.max);

  if (percentage >= 80) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${percentage >= 90 ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></div>
        <span className="text-gray-600">
          {globalStatus.remaining} requests left
        </span>
      </div>
    );
  }

  return null;
}

function getPercentage(used, max) {
  return Math.round((used / max) * 100);
}

export default RateLimitStatus;