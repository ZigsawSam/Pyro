"use client"

import { Wallet, CheckCircle, Clock, Loader2, XCircle } from "lucide-react"

interface CommissionStatsProps {
  totalCommission: number
  confirmed: number
  pending: number
  processing: number
  rejected: number
}

export function CommissionStats({ totalCommission, confirmed, pending, processing, rejected }: CommissionStatsProps) {
  const stats = [
    {
      label: "Total Commission",
      value: `₹${totalCommission.toLocaleString()}`,
      sub: "↑ 14.3% vs Jun 1 - Jun 10",
      icon: Wallet,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      showSub: true,
    },
    {
      label: "Confirmed",
      value: `₹${confirmed.toLocaleString()}`,
      sub: `${totalCommission > 0 ? ((confirmed / totalCommission) * 100).toFixed(1) : 0}% of total`,
      icon: CheckCircle,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      showSub: true,
    },
    {
      label: "Pending",
      value: `₹${pending.toLocaleString()}`,
      sub: `${totalCommission > 0 ? ((pending / totalCommission) * 100).toFixed(1) : 0}% of total`,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      showSub: true,
    },
    {
      label: "Processing",
      value: `₹${processing.toLocaleString()}`,
      sub: `${totalCommission > 0 ? ((processing / totalCommission) * 100).toFixed(1) : 0}% of total`,
      icon: Loader2,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      showSub: true,
    },
    {
      label: "Rejected",
      value: `₹${rejected.toLocaleString()}`,
      sub: `${totalCommission > 0 ? ((rejected / totalCommission) * 100).toFixed(1) : 0}% of total`,
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      showSub: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
            <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
              <stat.icon size={18} className={stat.iconColor} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{stat.value}</p>
          {stat.showSub && (
            <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
          )}
        </div>
      ))}
    </div>
  )
}