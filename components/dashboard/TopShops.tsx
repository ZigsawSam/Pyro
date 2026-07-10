"use client"

import { ArrowUpRight } from "lucide-react"
import { DashboardCard } from "./DashboardCard"

interface Shop {
  shop_id: number
  shop_name: string
  commission_rate: number
  total_sales: number
}

interface TopShopsProps {
  shops: Shop[]
}

const placeholderShops = [
  { rank: 1, name: "M S Traders", location: "Raxaul, Bihar", sales: 48250, growth: "22.5%", color: "bg-amber-100 text-amber-600" },
  { rank: 2, name: "Shree Balaji Store", location: "Motihari, Bihar", sales: 32100, growth: "15.8%", color: "bg-slate-100 text-slate-600" },
  { rank: 3, name: "Kanha General Store", location: "Sitamarhi, Bihar", sales: 21430, growth: "10.3%", color: "bg-orange-100 text-orange-600" },
]

export function TopShops({ shops }: TopShopsProps) {
  const hasShops = shops.length > 0

  return (
    <DashboardCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Top Performing Shops</h3>
        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All</button>
      </div>
      <div className="space-y-4">
        {hasShops ? shops.slice(0, 3).map((shop, i) => (
          <div key={shop.shop_id} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{shop.shop_name}</p>
              <p className="text-xs text-slate-500">{shop.commission_rate}% commission rate</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">₹{shop.total_sales.toLocaleString()}</p>
              <p className="text-xs text-emerald-500 flex items-center justify-end gap-0.5">
                <ArrowUpRight size={10} /> {i === 0 ? '22.5%' : i === 1 ? '15.8%' : '10.3%'}
              </p>
            </div>
          </div>
        )) : (
          placeholderShops.map((shop) => (
            <div key={shop.rank} className="flex items-center gap-3 opacity-40">
              <div className={`w-6 h-6 rounded-full ${shop.color} flex items-center justify-center text-xs font-bold`}>
                {shop.rank}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{shop.name}</p>
                <p className="text-xs text-slate-500">{shop.location}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">₹{shop.sales.toLocaleString()}</p>
                <p className="text-xs text-emerald-500">↑ {shop.growth}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardCard>
  )
}