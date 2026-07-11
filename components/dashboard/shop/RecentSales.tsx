"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { createShopClient } from "@/lib/supabase/shop-client"

interface RecentSalesProps {
  shopId: number
}

export function RecentSales({ shopId }: RecentSalesProps) {
  const supabase = createShopClient()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, amount, sale_date, agents:agent_id (name), customers:customer_id (name)")
        .eq("shop_id", shopId)
        .order("sale_date", { ascending: false })
        .limit(5)

      setSales(data || [])
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
        <h3 className="text-lg font-semibold text-slate-900">Recent Sales</h3>
        <Link href={`/shop/${shopId}/sales`} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No sales recorded yet</div>
      ) : (
        <div className="space-y-3">
          {sales.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">{(s.customers?.name || "C").charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.customers?.name || "Walk-in"}</p>
                  <p className="text-xs text-slate-400">{s.agents?.name || "Direct"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">₹{s.amount?.toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-400">{new Date(s.sale_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
