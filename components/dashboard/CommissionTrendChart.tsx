"use client"

import { useMemo } from "react"

interface DailyCommission {
  date: string
  amount: number
}

interface CommissionTrendChartProps {
  data: DailyCommission[]
  title?: string
}

export function CommissionTrendChart({ data, title = "Commission Trend" }: CommissionTrendChartProps) {
  const { points, maxValue, labels } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.amount), 1)
    const chartHeight = 180
    const chartWidth = 500
    const padding = { top: 20, right: 20, bottom: 30, left: 50 }
    const innerWidth = chartWidth - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom

    const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth

    const pts = data.map((d, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + innerHeight - (d.amount / max) * innerHeight,
      value: d.amount,
      label: new Date(d.date).getDate(),
      fullDate: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    }))

    // Generate y-axis labels
    const yLabels = [0, max * 0.33, max * 0.66, max].map((v) => ({
      value: Math.round(v),
      y: padding.top + innerHeight - (v / max) * innerHeight,
    }))

    return { points: pts, maxValue: max, labels: yLabels }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          No commission data yet
        </div>
      </div>
    )
  }

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0} ${200 - 30} L ${points[0]?.x || 0} ${200 - 30} Z`

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <select className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white">
          <option>This 10 Days</option>
          <option>This Month</option>
          <option>Last Month</option>
        </select>
      </div>
      <div className="relative">
        <svg viewBox="0 0 520 220" className="w-full h-auto">
          {/* Grid lines */}
          {labels.map((l, i) => (
            <g key={i}>
              <line
                x1={50}
                y1={l.y}
                x2={500}
                y2={l.y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text x={45} y={l.y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                ₹{(l.value / 1000).toFixed(1)}K
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaD} fill="url(#gradient)" opacity={0.2} />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />
              {/* Tooltip on last point */}
              {i === points.length - 1 && (
                <g>
                  <rect x={p.x - 35} y={p.y - 45} width={70} height={36} rx={6} fill="#1e293b" />
                  <text x={p.x} y={p.y - 28} textAnchor="middle" fontSize={10} fill="#94a3b8">
                    {p.fullDate}
                  </text>
                  <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={12} fill="white" fontWeight="bold">
                    ₹{p.value.toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* X-axis labels */}
          {points.map((p, i) => (
            <text key={`label-${i}`} x={p.x} y={210} textAnchor="middle" fontSize={10} fill="#94a3b8">
              {p.fullDate}
            </text>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}