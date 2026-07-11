"use client"

import { Store, TrendingUp, Wallet, ArrowRight, type LucideIcon } from "lucide-react"
import { DashboardCard } from "./DashboardCard"

interface ActivityItem {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  title: string
  description: string
  time: string
  badge: string
  badgeColor: string
}

const defaultActivities: ActivityItem[] = [
  {
    icon: Store,
    iconColor: "text-green-500",
    iconBg: "bg-green-50",
    title: "Shop Onboarded",
    description: 'New shop "Sunrise Retail" has been onboarded',
    time: "Today, 11:30 AM",
    badge: "Completed",
    badgeColor: "bg-green-100 text-green-700",
  },
  {
    icon: TrendingUp,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    title: "Commission Confirmed",
    description: "₹1,250 commission confirmed from M S Traders",
    time: "Today, 10:15 AM",
    badge: "Confirmed",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    icon: Wallet,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    title: "Payout Initiated",
    description: "Payout of ₹2,500 has been initiated",
    time: "Yesterday, 06:45 PM",
    badge: "Processing",
    badgeColor: "bg-amber-100 text-amber-700",
  },
]

interface RecentActivityProps {
  activities?: ActivityItem[]
}

export function RecentActivity({ activities = defaultActivities }: RecentActivityProps) {
  return (
    <DashboardCard>
      <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
              <item.icon size={14} className={item.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400">{item.time}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                {item.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
        View All Activity <ArrowRight size={14} />
      </button>
    </DashboardCard>
  )
}