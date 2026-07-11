"use client"

import { useEffect, useState } from "react"
import { createShopClient } from "@/lib/supabase/shop-client"

interface MonthlyTargetProps {
  shopId: number
}

export function MonthlyTarget({ shopId }: MonthlyTargetProps) {
  const supabase = createShopClient()
  const [achieved, setAchieved] = useState(0)
  const target = 1000000
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { data: sales } = await supabase
        .from("sales")
        .select("amount")
        .eq("shop_id", shopId)
        .gte("sale_date", startOfMonth)

      const total = (sales || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
      setAchieved(total)
      setLoading(false)
    }

    fetchData()
  }, [shopId, supabase])

  if (loading) {
    return <div className="bg-white rounded-2xl p-6 border border-slate-100 h-64 animate-pulse" />
  }

  const percentage = Math.min((achieved / target) * 100, 100)
  const circumference = 2 * Math.PI * 52
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Target</h3>
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx={60} cy={60} r={52} fill="none" stroke="#e2e8f0" strokeWidth={8} />
            <circle
              cx={60}
              cy={60}
              r={52}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{Math.round(percentage)}%</span>
          </div>
        </div>
        <div className="mt-4 text-center space-y-1">
          <p className="text-sm text-slate-500">Target: <span className="font-semibold text-slate-900">₹{target.toLocaleString("en-IN")}</span></p>
          <p className="text-sm text-slate-500">Achieved: <span className="font-semibold text-emerald-600">₹{achieved.toLocaleString("en-IN")}</span></p>
        </div>
      </div>
    </div>
  )
}
