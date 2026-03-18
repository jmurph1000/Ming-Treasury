'use client';

import { TrendingUp } from 'lucide-react';

export default function InvestmentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <TrendingUp className="h-16 w-16 text-[#1E6B3C]/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Track money market funds, T-bills, and other short-term investment positions across all custodians.
        </p>
        <div className="mt-6 w-full max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Phase 2</span>
            <span>Planning</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#1E6B3C] h-2 rounded-full" style={{ width: '15%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
