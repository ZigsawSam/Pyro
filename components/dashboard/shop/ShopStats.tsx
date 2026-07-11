"use client"

import { Store, Clock, XCircle, Search } from "lucide-react"

interface ShopStatsProps {
  linkedCount: number
  pendingCount: number
  rejectedCount: number
  availableCount: number
}

export function ShopStats({ linkedCount, pendingCount, rejectedCount, availableCount }: ShopStatsProps) {
  const stats = [
    { label: "Linked", value: linkedCount, icon: Store, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Rejected", value: rejectedCount, icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    { label: "Available", value: availableCount, icon: Search, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`bg-white rounded-xl p-4 border ${stat.border} shadow-sm flex items-center gap-3`}
        >
          <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
            <stat.icon size={20} className={stat.color} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}