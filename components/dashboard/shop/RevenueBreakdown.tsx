"use client"

import { useEffect, useState } from "react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface RevenueBreakdownProps {
  shopId: number
}

export function RevenueBreakdown({ shopId }: RevenueBreakdownProps) {
  const supabase = createShopClient()
  const [data, setData] = useState<{ label: string; value: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const { data: sales } = await supabase
        .from("sales")
        .select("amount, agent_id")
        .eq("shop_id", shopId)
        .gte("sale_date", startOfMonth)

      let agentSales = 0
      let walkInSales = 0

      ;(sales || []).forEach((s: any) => {
        if (s.agent_id) agentSales += s.amount || 0
        else walkInSales += s.amount || 0
      })

      const total = agentSales + walkInSales || 1

      setData([
        { label: "Agent Sales", value: agentSales, color: "#3b82f6" },
        { label: "Walk-in", value: walkInSales, color: "#10b981" },
      ])
      setLoading(false)
    }

    fetchData()
  }, [shopId, supabase])

  if (loading) {
    return <div className="bg-white rounded-2xl p-6 border border-slate-100 h-64 animate-pulse" />
  }

  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let cumulative = 0

  const segments = data.map((d) => {
    const percentage = (d.value / total) * 100
    const startAngle = (cumulative / 100) * 360
    const endAngle = ((cumulative + percentage) / 100) * 360
    cumulative += percentage

    const startRad = ((startAngle - 90) * Math.PI) / 180
    const endRad = ((endAngle - 90) * Math.PI) / 180
    const r = 60
    const cx = 80
    const cy = 80

    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)

    const largeArc = percentage > 50 ? 1 : 0

    return {
      ...d,
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      percentage: Math.round(percentage * 10) / 10,
    }
  })

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Breakdown</h3>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0">
          {segments.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} />
          ))}
          <circle cx={80} cy={80} r={36} fill="white" />
          <text x={80} y={76} textAnchor="middle" fontSize={12} fontWeight={600} fill="#1e293b">
            ₹{(total / 1000).toFixed(0)}k
          </text>
          <text x={80} y={92} textAnchor="middle" fontSize={9} fill="#64748b">Total</text>
        </svg>
        <div className="space-y-3 flex-1">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-slate-600">{s.label}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">₹{s.value.toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-400">{s.percentage}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
