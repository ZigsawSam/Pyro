"use client"

import { Search, Receipt, TrendingUp, Wallet, type LucideIcon } from "lucide-react"
import { DashboardCard } from "./DashboardCard"

interface ActionItem {
  icon: LucideIcon
  color: string
  hoverBorder: string
  hoverBg: string
  title: string
  description: string
}

const actions: ActionItem[] = [
  { icon: Search, color: "text-blue-500", hoverBorder: "hover:border-blue-300", hoverBg: "hover:bg-blue-50", title: "Find Shops", description: "Search & onboard" },
  { icon: Receipt, color: "text-green-500", hoverBorder: "hover:border-green-300", hoverBg: "hover:bg-green-50", title: "Sales Statement", description: "View your sales" },
  { icon: TrendingUp, color: "text-purple-500", hoverBorder: "hover:border-purple-300", hoverBg: "hover:bg-purple-50", title: "Commission Details", description: "Track commissions" },
  { icon: Wallet, color: "text-orange-500", hoverBorder: "hover:border-orange-300", hoverBg: "hover:bg-orange-50", title: "Request Payout", description: "Withdraw earnings" },
]

export function QuickActions() {
  return (
    <DashboardCard>
      <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            className={`p-4 rounded-xl border border-slate-200 ${action.hoverBorder} ${action.hoverBg} transition-all text-left group`}
          >
            <action.icon size={20} className={`${action.color} mb-2`} />
            <p className="text-sm font-medium text-slate-900">{action.title}</p>
            <p className="text-xs text-slate-500">{action.description}</p>
          </button>
        ))}
      </div>
    </DashboardCard>
  )
}