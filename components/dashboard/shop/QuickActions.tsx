"use client"

import { Plus, UserPlus, Users, Banknote, FileText, Package } from "lucide-react"
import Link from "next/link"

interface QuickActionsProps {
  shopId: number
}

export function QuickActions({ shopId }: QuickActionsProps) {
  const actions = [
    {
      label: "Record Sale",
      icon: Plus,
      href: `/shop/${shopId}/sales`,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "Invite Agent",
      icon: UserPlus,
      href: `/shop/${shopId}/agents`,
      color: "bg-violet-600 hover:bg-violet-700",
    },
    {
      label: "Add Staff",
      icon: Users,
      href: `/shop/${shopId}/staff`,
      color: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      label: "Approve Payout",
      icon: Banknote,
      href: `/shop/${shopId}/payouts`,
      color: "bg-orange-600 hover:bg-orange-700",
    },
    {
      label: "Reports",
      icon: FileText,
      href: `/shop/${shopId}/reports`,
      color: "bg-slate-600 hover:bg-slate-700",
    },
    {
      label: "Inventory",
      icon: Package,
      href: `/shop/${shopId}/inventory`,
      color: "bg-amber-600 hover:bg-amber-700",
    },
  ]

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl text-white transition-all ${a.color} shadow-sm hover:shadow-md hover:-translate-y-0.5`}
          >
            <a.icon size={20} />
            <span className="text-xs font-medium">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
