"use client"

import { useState, useEffect } from "react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface SalesTrendChartProps {
  shopId: number
}

export function SalesTrendChart({ shopId }: SalesTrendChartProps) {
  const supabase = createShopClient()
  const [period, setPeriod] = useState<7 | 30 | 90>(7)
  const [data, setData] = useState<{ date: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - period)

      const { data: sales } = await supabase
        .from("sales")
        .select("amount, sale_date")
        .eq("shop_id", shopId)
        .gte("sale_date", startDate.toISOString())
        .lte("sale_date", endDate.toISOString())
        .order("sale_date", { ascending: true })

      // Group by date
      const grouped: Record<string, number> = {}
      for (let i = 0; i < period; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (period - 1 - i))
        grouped[d.toISOString().split("T")[0]] = 0
      }

      ;(sales || []).forEach((s: any) => {
        const date = s.sale_date.split("T")[0]
        if (grouped[date] !== undefined) grouped[date] += s.amount || 0
      })

      const chartData = Object.entries(grouped).map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        amount,
      }))

      setData(chartData)
      setLoading(false)
    }

    fetchData()
  }, [shopId, period, supabase])

  if (loading) {
    return <div className="bg-white rounded-2xl p-6 border border-slate-100 h-80 animate-pulse" />
  }

  const maxVal = Math.max(...data.map((d) => d.amount), 1)
  const chartHeight = 200
  const chartWidth = data.length > 0 ? 600 : 0
  const padding = 40

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2)
    const y = chartHeight - padding - (d.amount / maxVal) * (chartHeight - padding * 2)
    return `${x},${y}`
  }).join(" ")

  const areaPoints = `${padding},${chartHeight - padding} ${points} ${chartWidth - padding},${chartHeight - padding}`

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Daily Sales</h3>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as 7 | 30 | 90)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p} Days
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - ratio * (chartHeight - padding * 2)
            return (
              <g key={ratio}>
                <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4" />
                <text x={padding - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                  ₹{Math.round(maxVal * ratio).toLocaleString("en-IN")}
                </text>
              </g>
            )
          })}

          {/* Area fill */}
          <polygon points={areaPoints} fill="url(#gradient)" opacity={0.2} />

          {/* Line */}
          <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots */}
          {data.map((d, i) => {
            const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2)
            const y = chartHeight - padding - (d.amount / maxVal) * (chartHeight - padding * 2)
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />
                <text x={x} y={chartHeight - 10} textAnchor="middle" fontSize={10} fill="#64748b">{d.date}</text>
              </g>
            )
          })}

          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}
