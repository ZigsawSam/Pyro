"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, CreditCard, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { PayrollPaymentDialog } from "@/components/payroll/payroll-payment-dialog"
import { getShopToken } from "@/lib/storage-utils"

interface Salary {
  id: number
  staff_id: number
  staff_name: string
  present_days: number
  base_salary: number
  advances: number
  final_payable: number
  status: string
  account_name?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  upi_id?: string
}

export default function SalaryPage() {
  const params = useParams()
  const shopId = Number(params.shopId as string)
  const [salaries, setSalaries] = useState<Salary[]>([])
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null)
  const [showPayDialog, setShowPayDialog] = useState(false)

  useEffect(() => { fetchSalaries() }, [shopId, month])

  const fetchSalaries = async () => {
    try {
      const response = await fetch(`/api/shops/${shopId}/salary?month=${month}`, { headers: { Authorization: `Bearer ${getShopToken()}` } })
      if (!response.ok) throw new Error("Failed to fetch salaries")
      const data = await response.json()
      setSalaries(data.salaries || [])
    } catch (error) { console.error("Error:", error) } finally { setIsLoading(false) }
  }

  const handleGenerateSalary = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/shops/${shopId}/salary/generate`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getShopToken()}` }, body: JSON.stringify({ month: `${month}-01` }) })
      if (!response.ok) throw new Error("Failed to generate salary")
      fetchSalaries()
    } catch (error) { console.error("Error:", error) } finally { setIsGenerating(false) }
  }

  const openPay = (salary: Salary) => { setSelectedSalary(salary); setShowPayDialog(true) }

  return (
    <MainLayout title="Salary" subtitle="Manage staff salaries and payments" shopId={shopId}>
      <div className="mb-6 flex flex-wrap gap-4 items-end justify-between">
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded border border-border bg-card px-3 py-2" />
        </div>
        <Button onClick={handleGenerateSalary} disabled={isGenerating} className="gap-2">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />}Generate Salary</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {salaries.map((salary) => {
          const isCleared = salary.status === "paid"
          return (
            <Card key={salary.id} className="p-5 transition hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{salary.staff_name}</h3>
                    {isCleared ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Present days: {salary.present_days}</p>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-semibold ${salary.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{salary.status}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Base Salary</span><span className="font-medium">₹{Number(salary.base_salary || 0).toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Advances</span><span className="font-medium">₹{Number(salary.advances || 0).toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Payable</span><span className="font-medium">₹{Number(salary.final_payable || 0).toLocaleString()}</span></div>
              </div>
              <Button variant="ghost" className="mt-4 w-full justify-start gap-2" onClick={() => openPay(salary)}><CreditCard className="h-4 w-4" />Process Payment</Button>
            </Card>
          )
        })}
      </div>

      <PayrollPaymentDialog open={showPayDialog} onOpenChange={setShowPayDialog} shopId={shopId} salary={selectedSalary} onPaid={fetchSalaries} />
    </MainLayout>
  )
}
