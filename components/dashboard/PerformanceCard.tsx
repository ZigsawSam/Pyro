"use client"

import { Target } from "lucide-react"
import { DashboardCard } from "./DashboardCard"

interface PerformanceCardProps {
  percentage?: number
  target?: number
  achieved?: number
}

export function PerformanceCard({
  percentage = 72,
  target = 200000,
  achieved = 145620,
}: PerformanceCardProps) {
  const remaining = target - achieved
  const circumference = 251
  const strokeDash = (percentage / 100) * circumference

  return (
    <DashboardCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-blue-500" />
          <h3 className="font-semibold text-slate-900">Performance This Month</h3>
        </div>
        <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
          Great going! 🎉
        </span>
      </div>
      <div className="flex items-center justify-center py-1">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="8"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-slate-900">{percentage}%</span>
            <span className="text-[9px] text-slate-400">of monthly target</span>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Target</span>
          <span className="font-semibold text-slate-900">₹{target.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Achieved</span>
          <span className="font-semibold text-slate-900">₹{achieved.toLocaleString()}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-[11px] text-slate-500">
          ₹{remaining.toLocaleString()} left to reach your target
        </p>
      </div>
    </DashboardCard>
  )
}