"use client"

import { BarChart3 } from "lucide-react"
import { DashboardCard } from "./DashboardCard"

interface SalesChartProps {
  totalSales: number
}

export function SalesChart({ totalSales }: SalesChartProps) {
  const data = [12, 18, 14, 22, 16, 25, 20, 28, 24, 30]
  const labels = ['Jul 1','2','3','4','5','6','7','8','9','10']

  return (
    <DashboardCard>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} className="text-blue-500" />
        <h3 className="font-semibold text-slate-900">Sales Overview</h3>
      </div>
      <div className="h-40 flex items-end justify-between gap-2 px-2">
        {data.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full max-w-[28px] rounded-t-sm transition-all"
              style={{
                height: `${h * 3}px`,
                background: i === 9 ? '#3b82f6' : '#dbeafe',
              }}
            />
            <span className="text-[9px] text-slate-400">{labels[i]}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}