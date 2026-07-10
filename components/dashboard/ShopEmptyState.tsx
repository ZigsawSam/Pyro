"use client"

import { Store, Search, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ShopEmptyStateProps {
  tab: "linked" | "pending" | "rejected" | "discover"
  onAction?: () => void
}

export function ShopEmptyState({ tab, onAction }: ShopEmptyStateProps) {
  const configs = {
    linked: {
      icon: Store,
      title: "No linked shops yet",
      description: "Start by searching nearby shops and sending partnership requests.",
      action: "Find Shops",
      showAction: true,
    },
    pending: {
      icon: Search,
      title: "No pending requests",
      description: "You don't have any pending shop partnership requests.",
      action: "",
      showAction: false,
    },
    rejected: {
      icon: Store,
      title: "No rejected requests",
      description: "Great! None of your shop requests have been rejected.",
      action: "",
      showAction: false,
    },
    discover: {
      icon: Search,
      title: "No shops found",
      description: "Try adjusting your search or filters to find more shops.",
      action: "Clear Filters",
      showAction: true,
    },
  }

  const config = configs[tab]
  const Icon = config.icon

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{config.title}</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">{config.description}</p>
      {config.showAction && onAction && (
        <Button onClick={onAction} className="bg-blue-600 hover:bg-blue-700 text-white">
          {config.action} <ArrowRight size={16} className="ml-1" />
        </Button>
      )}
    </div>
  )
}