"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, FileText, Download, Calendar, Store, TrendingUp, ArrowLeft } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const reportTypes = [
  {
    title: "Sales Report",
    description: "Complete sales history with shop-wise breakdown",
    icon: TrendingUp,
    color: "blue",
    format: "CSV, PDF",
  },
  {
    title: "Commission Report",
    description: "Detailed commission earnings by shop and date",
    icon: FileText,
    color: "green",
    format: "CSV, PDF",
  },
  {
    title: "Shop Report",
    description: "Performance metrics for each linked shop",
    icon: Store,
    color: "purple",
    format: "CSV, PDF",
  },
  {
    title: "Monthly Report",
    description: "Consolidated monthly summary of all activities",
    icon: Calendar,
    color: "orange",
    format: "PDF",
  },
]

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/agent-login"); return }
      const { data: agent } = await supabase.from("agents").select("id, name").eq("user_id", user.id).single()
      if (!agent) { router.push("/auth/agent-login"); return }
      setAgentId(agent.id)
      setAgentName(agent.name)
      setLoading(false)
    }
    checkAuth()
  }, [router, supabase])

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Reports" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="outline" size="sm" onClick={() => router.push("/agent/dashboard")} className="mb-3 border-slate-200 gap-1.5">
            <ArrowLeft size={16} /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Export and analyze your business data</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon
              return (
                <Card key={report.title} className="p-5 bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-${report.color}-50 flex items-center justify-center shrink-0`}>
                      <Icon size={24} className={`text-${report.color}-500`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{report.title}</h3>
                      <p className="text-sm text-slate-500 mb-3">{report.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{report.format}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 border-slate-200 gap-1.5">
                      <Download size={14} /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-slate-200 gap-1.5">
                      <FileText size={14} /> PDF
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}