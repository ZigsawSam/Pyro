"use client"

import { Search, Filter, Download, Eye, MoreVertical, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export type CommissionStatus = "confirmed" | "pending" | "processing" | "rejected" | "approved"

interface CommissionRecord {
  id: number
  date: string
  time: string
  shopName: string
  location: string
  salesAmount: number
  commission: number
  rate: number
  status: CommissionStatus
  payoutMonth: string
}

interface CommissionHistoryTableProps {
  records: CommissionRecord[]
  shops?: string[]
  onViewDetails?: (id: number) => void
}

export function CommissionHistoryTable({ records, shops = [], onViewDetails }: CommissionHistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState("All Shops")
  const [statusFilter, setStatusFilter] = useState("All Status")

  const statusConfig: Record<CommissionStatus, { label: string; bg: string; text: string }> = {
    confirmed: { label: "Confirmed", bg: "bg-emerald-50", text: "text-emerald-700" },
    pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700" },
    processing: { label: "Processing", bg: "bg-blue-50", text: "text-blue-700" },
    rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-700" },
    approved: { label: "Approved", bg: "bg-emerald-50", text: "text-emerald-700" },
  }

  const filtered = records.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesShop = shopFilter === "All Shops" || r.shopName === shopFilter
    const matchesStatus = statusFilter === "All Status" || r.status === statusFilter.toLowerCase()
    return matchesSearch && matchesShop && matchesStatus
  })

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-lg mb-4">Commission History</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by shop name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200"
            />
          </div>
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option>All Shops</option>
            {shops.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option>All Status</option>
            <option>Confirmed</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Rejected</option>
          </select>
          <Button variant="outline" size="sm" className="border-slate-200 gap-1.5">
            <Filter size={14} /> Filters
          </Button>
          <Button variant="outline" size="sm" className="border-slate-200 gap-1.5 ml-auto">
            <Download size={14} /> Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              <th className="py-3 px-5 font-medium">Date</th>
              <th className="py-3 px-5 font-medium">Shop Name</th>
              <th className="py-3 px-5 font-medium">Location</th>
              <th className="py-3 px-5 font-medium text-right">Sales Amount</th>
              <th className="py-3 px-5 font-medium text-right">Commission</th>
              <th className="py-3 px-5 font-medium text-right">Rate</th>
              <th className="py-3 px-5 font-medium">Status</th>
              <th className="py-3 px-5 font-medium">Payout Month</th>
              <th className="py-3 px-5 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => {
              const config = statusConfig[record.status]
              return (
                <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-5">
                    <p className="text-slate-900 font-medium">{record.date}</p>
                    <p className="text-xs text-slate-400">{record.time}</p>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        record.status === "rejected"
                          ? "bg-red-50 text-red-600"
                          : record.status === "pending"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-blue-50 text-blue-600"
                      }`}>
                        {record.shopName.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900">{record.shopName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-slate-600 flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400" />
                      {record.location}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-medium text-slate-900">
                    ₹{record.salesAmount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5 text-right font-bold text-slate-900">
                    ₹{record.commission.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5 text-right text-slate-600">{record.rate}%</td>
                  <td className="py-3.5 px-5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.bg} ${config.text}`}>
                      {config.label}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">{record.payoutMonth}</td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onViewDetails?.(record.id)}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>No commission records found.</p>
        </div>
      )}
    </div>
  )
}