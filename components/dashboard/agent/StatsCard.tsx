"use client"

import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react"
import { DashboardCard } from "./DashboardCard"

interface StatsCardProps {
  title: string
  value: string
  trend?: {
    type: "up" | "down" | "neutral"
    value: string
    label: string
  }
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
}

export function StatsCard({
  title,
  value,
  trend,
  icon: Icon,
  iconColor = "text-blue-500",
  iconBg = "bg-blue-50",
}: StatsCardProps) {
  const TrendIcon = trend?.type === "up" ? ArrowUpRight : trend?.type === "down" ? ArrowDownRight : Minus
  const trendColor = trend?.type === "up" ? "text-emerald-500" : trend?.type === "down" ? "text-red-500" : "text-slate-400"

  return (
    <DashboardCard>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendIcon size={14} className={trendColor} />
              <span className={`font-medium ${trendColor}`}>{trend.value}</span>
              <span className="text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </DashboardCard>
  )
}