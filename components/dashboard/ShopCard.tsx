"use client"

import { Store, TrendingUp, Wallet, ArrowRight, X, RotateCcw, MapPin, Phone, User, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export type ShopStatus = "linked" | "pending" | "rejected" | "available" | "discover"
interface ShopCardProps {
  shopId: number
  name: string
  location?: string
  ownerName?: string
  phone?: string
  commissionRate?: number
  requestedRate?: number
  totalSales?: number
  totalCommission?: number
  pendingCommission?: number
  status: ShopStatus
  rejectedAt?: string
  rejectReason?: string
  requestedAt?: string
  onViewDetails?: (shopId: number) => void
  onCancelRequest?: (shopId: number) => void
  onRequestAgain?: (shopId: number) => void
  onRequestPartnership?: (shop: any) => void
}

export function ShopCard({
  shopId,
  name,
  location,
  ownerName,
  phone,
  commissionRate,
  requestedRate,
  totalSales = 0,
  totalCommission = 0,
  pendingCommission = 0,
  status,
  rejectedAt,
  rejectReason,
  requestedAt,
  onViewDetails,
  onCancelRequest,
  onRequestAgain,
  onRequestPartnership,
}: ShopCardProps) {
  const statusConfig = {
    linked: { badge: "Linked", badgeColor: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", accent: "bg-emerald-50" },
    pending: { badge: "Pending", badgeColor: "bg-amber-100 text-amber-700", border: "border-amber-200", accent: "bg-amber-50" },
    rejected: { badge: "Rejected", badgeColor: "bg-red-100 text-red-700", border: "border-red-200", accent: "bg-red-50" },
    available: { badge: "Available", badgeColor: "bg-blue-100 text-blue-700", border: "border-blue-200", accent: "bg-blue-50" },
  }

  const config = statusConfig[status]

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  }

  const daysAgo = (dateStr?: string) => {
    if (!dateStr) return ""
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  return (
    <div className={`bg-white rounded-xl border ${config.border} shadow-sm hover:shadow-md transition-all p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.accent} flex items-center justify-center`}>
            <Store size={20} className={status === "linked" ? "text-emerald-600" : status === "pending" ? "text-amber-600" : status === "rejected" ? "text-red-600" : "text-blue-600"} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{name}</h3>
            {location && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin size={12} /> {location}
              </p>
            )}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.badgeColor}`}>
          {config.badge}
        </span>
      </div>

      {/* Linked Shop Stats */}
      {status === "linked" && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Commission</p>
            <p className="text-sm font-bold text-slate-900">{commissionRate}%</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Sales</p>
            <p className="text-sm font-bold text-slate-900">₹{(totalSales / 1000).toFixed(0)}k</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Pending</p>
            <p className="text-sm font-bold text-amber-600">₹{pendingCommission.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Pending Info */}
      {status === "pending" && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Requested Rate</span>
            <span className="font-semibold text-slate-900">{requestedRate}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Sent</span>
            <span className="text-slate-700">{daysAgo(requestedAt)}</span>
          </div>
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Clock size={12} /> Waiting for approval
          </p>
        </div>
      )}

      {/* Rejected Info */}
      {status === "rejected" && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Rejected</span>
            <span className="text-slate-700">{formatDate(rejectedAt)}</span>
          </div>
          <div className="bg-red-50 rounded-lg p-2.5">
            <p className="text-xs text-red-600 font-medium">Reason</p>
            <p className="text-sm text-slate-700">{rejectReason || "No reason provided"}</p>
          </div>
        </div>
      )}

      {/* Available Info */}
      {status === "available" && (
        <div className="mb-4 space-y-1.5">
          {ownerName && (
            <p className="text-sm text-slate-600 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" /> {ownerName}
            </p>
          )}
          {phone && (
            <p className="text-sm text-slate-600 flex items-center gap-1.5">
              <Phone size={14} className="text-slate-400" /> {phone}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {status === "linked" && onViewDetails && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-slate-200 hover:bg-slate-50"
            onClick={() => onViewDetails(shopId)}
          >
            View Details <ArrowRight size={14} className="ml-1" />
          </Button>
        )}
        {status === "pending" && onCancelRequest && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onCancelRequest(shopId)}
          >
            <X size={14} className="mr-1" /> Cancel Request
          </Button>
        )}
        {status === "rejected" && onRequestAgain && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => onRequestAgain(shopId)}
          >
            <RotateCcw size={14} className="mr-1" /> Request Again
          </Button>
        )}
        {status === "available" && onRequestPartnership && (
          <Button
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onRequestPartnership({ shopId, name, location, ownerName, phone })}
          >
            Request Partnership <ArrowRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}