"use client"

import { useMemo } from "react"

interface CommissionBreakdownProps {
  confirmed: number
  pending: number
  processing: number
  rejected: number
  total: number
}

export function CommissionBreakdown({ confirmed, pending, processing, rejected, total }: CommissionBreakdownProps) {
  const segments = useMemo(() => {
    const circumference = 2 * Math.PI * 70
    const items = [
      { label: "Confirmed", value: confirmed, color: "#22c55e" },
      { label: "Pending", value: pending, color: "#f59e0b" },
      { label: "Processing", value: processing, color: "#3b82f6" },
      { label: "Rejected", value: rejected, color: "#ef4444" },
    ]

    let offset = 0
    return items.map((item) => {
      const pct = total > 0 ? item.value / total : 0
      const dash = pct * circumference
      const segment = { ...item, pct, dash, offset, circumference }
      offset += dash
      return segment
    })
  }, [confirmed, pending, processing, rejected, total])

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <h3 className="font-semibold text-slate-900 mb-4">Commission Breakdown</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#f1f5f9" strokeWidth={16} />
            {segments.map((s) => (
              <circle
                key={s.label}
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={s.color}
                strokeWidth={16}
                strokeDasharray={`${s.dash} ${s.circumference - s.dash}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-slate-900">₹{total.toLocaleString()}</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-slate-600">{s.label}</span>
            </div>
            <span className="font-medium text-slate-900">
              ₹{s.value.toLocaleString()} ({(s.pct * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}