"use client"

import { TrendingUp } from "lucide-react"
import { DashboardCard } from "./DashboardCard"

interface CommissionChartProps {
  totalCommission: number
}

export function CommissionChart({ totalCommission }: CommissionChartProps) {
  const segments = [
    { label: 'Confirmed', color: '#3b82f6', value: '₹4,042 (64.8%)', dash: 163 },
    { label: 'Pending', color: '#10b981', value: '₹1,650 (26.4%)', dash: 50 },
    { label: 'Processing', color: '#f59e0b', value: '₹350 (5.6%)', dash: 25 },
    { label: 'Rejected', color: '#ef4444', value: '₹200 (3.2%)', dash: 13 },
  ]

  let offset = 0

  return (
    <DashboardCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-500" />
          <h3 className="font-semibold text-slate-900">Commission Trend</h3>
        </div>
        <select className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white">
          <option>This 10 Days</option>
        </select>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#dbeafe" strokeWidth="10" />
            {segments.map((seg, i) => {
              const currentOffset = offset
              offset -= seg.dash
              return (
                <circle
                  key={i}
                  cx="50" cy="50" r="38" fill="none" stroke={seg.color} strokeWidth="10"
                  strokeDasharray={`${seg.dash} 251`}
                  strokeDashoffset={currentOffset}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-slate-900">₹{totalCommission.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">Total</span>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
              <span className="text-slate-600">{seg.label}</span>
            </div>
            <span className="font-medium text-slate-900">{seg.value}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}