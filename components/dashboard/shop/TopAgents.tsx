"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Trophy } from "lucide-react"
import Link from "next/link"
import { createShopClient } from "@/lib/supabase/shop-client"

interface TopAgentsProps {
  shopId: number
}

export function TopAgents({ shopId }: TopAgentsProps) {
  const supabase = createShopClient()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const { data: sales } = await supabase
        .from("sales")
        .select("amount, commission_amount, agent_id, agents:agent_id (name)")
        .eq("shop_id", shopId)
        .gte("sale_date", startOfMonth)
        .not("agent_id", "is", null)

      const grouped: Record<number, { name: string; sales: number; commission: number }> = {}
      ;(sales || []).forEach((s: any) => {
        const id = s.agent_id
        if (!grouped[id]) grouped[id] = { name: s.agents?.name || "Agent", sales: 0, commission: 0 }
        grouped[id].sales += s.amount || 0
        grouped[id].commission += s.commission_amount || 0
      })

      const sorted = Object.values(grouped)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)

      setAgents(sorted)
      setLoading(false)
    }

    fetchData()
  }, [shopId, supabase])

  if (loading) {
    return <div className="bg-white rounded-2xl p-6 border border-slate-100 h-80 animate-pulse" />
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Top Agents</h3>
        <Link href={`/shop/${shopId}/agents`} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No agent sales this month</div>
      ) : (
        <div className="space-y-3">
          {agents.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-amber-100 text-amber-600" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                }`}>
                  {i === 0 ? <Trophy size={12} /> : i + 1}
                </div>
                <p className="text-sm font-medium text-slate-900">{a.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">₹{a.sales.toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-400">Comm: ₹{a.commission.toLocaleString("en-IN")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
