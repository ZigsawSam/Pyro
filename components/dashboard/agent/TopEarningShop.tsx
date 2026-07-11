"use client"

import { Store, TrendingUp } from "lucide-react"

interface TopEarningShopProps {
  shopName: string
  location: string
  commission: number
  sales: number
  percentageOfTotal: number
}

export function TopEarningShop({ shopName, location, commission, sales, percentageOfTotal }: TopEarningShopProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <h3 className="font-semibold text-slate-900 mb-4">Top Earning Shop</h3>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
          <Store size={20} className="text-purple-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{shopName}</p>
          <p className="text-xs text-slate-500">{location}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Commission</p>
          <p className="text-lg font-bold text-slate-900">₹{commission.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Sales</p>
          <p className="text-lg font-bold text-slate-900">₹{sales.toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm text-emerald-600">
        <TrendingUp size={14} />
        <span className="font-medium">{percentageOfTotal}%</span>
        <span className="text-slate-400">of your total commission</span>
      </div>
    </div>
  )
}