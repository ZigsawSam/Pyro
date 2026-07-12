"use client"

import { createShopClient } from "@/lib/supabase/shop-client"
import { useEffect, useState, useMemo, useCallback } from "react"
import {
  Wallet,
  Search,
  Printer,
  RotateCcw,
  Banknote,
  QrCode,
  Users,
  UserCircle,
  Clock,
  X,
  Copy,
  Info,
  Sparkles,
  Building,
  CreditCard,
  Send,
  Coins,
  ChevronDown,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { MainLayout } from "@/components/layout/main-layout"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */

interface StaffMember {
  id: number
  name: string
  role: string
  pending_salary: number
  salary_type: string
}

interface Agent {
  id: number
  name: string
  phone_number: string
  pending_commission: number
}

interface PayoutRecord {
  id: number
  receipt_number: string
  recipient_name: string
  profile_type: "staff" | "agent"
  settled_date: string
  payment_method: string
  amount_paid: number
  person_id: number
  status: "paid" | "reversed"
  remarks: string | null
}

type FilterTab = "all" | "staff" | "agent"
type PaymentMethod = "bank" | "upi" | "qr" | "cash"

interface PayoutsClientProps {
  shopId: string
  user?: any
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────────────────────── */

export function ShopPayoutsPage({ shopId: shopIdProp }: PayoutsClientProps) {
  const shopId = parseInt(shopIdProp, 10)
  const supabase = createShopClient()

  /* ── State ── */
  const [shopName, setShopName] = useState("Your Shop")
  const [staffPayroll, setStaffPayroll] = useState<StaffMember[]>([])
  const [agentCommissions, setAgentCommissions] = useState<Agent[]>([])
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<FilterTab>("all")

  // Modals
  const [showDisburseDialog, setShowDisburseDialog] = useState(false)
  const [disburseType, setDisburseType] = useState<"staff" | "agent" | null>(null)

  // Receipt modal
  const [selectedReceipt, setSelectedReceipt] = useState<PayoutRecord | null>(null)
  const [receiptCopied, setReceiptCopied] = useState(false)

  // Disbursement form state
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [disburseMethod, setDisburseMethod] = useState<PaymentMethod>("bank")
  const [disburseAmount, setDisburseAmount] = useState(0)
  const [disburseRemarks, setDisburseRemarks] = useState("")

  // Reversal modal
  const [payoutToReverse, setPayoutToReverse] = useState<PayoutRecord | null>(null)

  // QR simulation
  const [showQRScanSim, setShowQRScanSim] = useState(false)
  const [pendingPayout, setPendingPayout] = useState<{
    personId: number
    type: "staff" | "agent"
    amount: number
    method: PaymentMethod
    remarks: string
  } | null>(null)

  // Success messages
  const [disburseSuccessMsg, setDisburseSuccessMsg] = useState("")
  const [reversalSuccessMsg, setReversalSuccessMsg] = useState("")

  /* ── Data Fetching ── */
  const fetchData = useCallback(async () => {
    if (isNaN(shopId)) return
    setLoading(true)
    try {
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
      const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

      // 0. Fetch shop name
      const { data: shopData } = await supabase
        .from("shops")
        .select("shop_name")
        .eq("id", shopId)
        .single()

      if (shopData?.shop_name) {
        setShopName(shopData.shop_name)
      }

      // 1. Staff with pending salary
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, role, salary_type, base_salary, working_hours_per_day, overtime_rate")
        .eq("shop_id", shopId)
        .eq("is_active", true)

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("staff_id, status, work_hours, overtime_hours")
        .eq("shop_id", shopId)
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd)

      const { data: staffPayouts } = await supabase
        .from("payouts")
        .select("staff_id, amount_paid, status")
        .eq("shop_id", shopId)
        .eq("person_type", "staff")
        .gte("payment_date", monthStart)
        .lte("payment_date", monthEnd)

      const payoutsMap: Record<number, number> = {}
      ;(staffPayouts || []).forEach((p: any) => {
        if (p.status !== "reversed") {
          payoutsMap[p.staff_id] = (payoutsMap[p.staff_id] || 0) + Number(p.amount_paid || 0)
        }
      })

      const attendanceMap: Record<number, any> = {}
      ;(attendanceData || []).forEach((a: any) => {
        if (!attendanceMap[a.staff_id]) {
          attendanceMap[a.staff_id] = { present_days: 0, half_days: 0, total_hours: 0, overtime_hours: 0 }
        }
        if (a.status === "present") attendanceMap[a.staff_id].present_days += 1
        if (a.status === "half") attendanceMap[a.staff_id].half_days += 1
        attendanceMap[a.staff_id].total_hours += Number(a.work_hours || 0)
        attendanceMap[a.staff_id].overtime_hours += Number(a.overtime_hours || 0)
      })

      const staffWithPayroll = (staffData || []).map((s: any) => {
        const att = attendanceMap[s.id] || { present_days: 0, half_days: 0, total_hours: 0, overtime_hours: 0 }
        const presentDays = att.present_days + (att.half_days * 0.5)
        const overtimePay = att.overtime_hours * (s.overtime_rate || 0)

        let salary = 0
        if (s.salary_type === "monthly") {
          const dailyWage = (s.base_salary || 0) / 30
          salary = (dailyWage * presentDays) + overtimePay
        } else if (s.salary_type === "daily") {
          salary = ((s.base_salary || 0) * presentDays) + overtimePay
        } else if (s.salary_type === "hourly") {
          salary = ((s.base_salary || 0) * att.total_hours) + overtimePay
        }

        const totalPayouts = payoutsMap[s.id] || 0
        const pending = Math.max(0, Math.round(salary - totalPayouts))

        return {
          id: s.id,
          name: s.name,
          role: s.role,
          pending_salary: pending,
          salary_type: s.salary_type,
        }
      }).filter((s: StaffMember) => s.pending_salary > 0)

      setStaffPayroll(staffWithPayroll)

      // 2. Agents with pending commission
      const { data: shopAgents } = await supabase
        .from("shop_agents")
        .select("agent_id, commission_rate")
        .eq("shop_id", shopId)

      const agentIds = (shopAgents || []).map((sa: any) => sa.agent_id)

      const { data: agentsData } = await supabase
        .from("agents")
        .select("id, name, phone_number")
        .in("id", agentIds)

      const { data: salesData } = await supabase
        .from("sales")
        .select("agent_id, commission_amount")
        .eq("shop_id", shopId)
        .in("agent_id", agentIds)

      const { data: agentPayouts } = await supabase
        .from("payouts")
        .select("agent_id, amount_paid, status")
        .eq("shop_id", shopId)
        .eq("person_type", "agent")

      const salesMap: Record<number, number> = {}
      ;(salesData || []).forEach((s: any) => {
        salesMap[s.agent_id] = (salesMap[s.agent_id] || 0) + Number(s.commission_amount || 0)
      })

      const agentPayoutsMap: Record<number, number> = {}
      ;(agentPayouts || []).forEach((p: any) => {
        if (p.status !== "reversed") {
          agentPayoutsMap[p.agent_id] = (agentPayoutsMap[p.agent_id] || 0) + Number(p.amount_paid || 0)
        }
      })

      const agentsWithCommission = (agentsData || []).map((a: any) => {
        const totalCommission = salesMap[a.id] || 0
        const totalPaid = agentPayoutsMap[a.id] || 0
        const pending = Math.max(0, Math.round(totalCommission - totalPaid))
        return {
          id: a.id,
          name: a.name,
          phone_number: a.phone_number,
          pending_commission: pending,
        }
      }).filter((a: Agent) => a.pending_commission > 0)

      setAgentCommissions(agentsWithCommission)

      // 3. Payout history
      const { data: historyData } = await supabase
        .from("payouts")
        .select("id, staff_id, agent_id, person_type, amount_paid, payment_date, payment_method, remarks, status, receipt_number")
        .eq("shop_id", shopId)
        .order("payment_date", { ascending: false })
        .limit(50)

      const history: PayoutRecord[] = (historyData || []).map((h: any) => {
        const isStaff = h.person_type === "staff"
        const person = isStaff
          ? (staffData || []).find((s: any) => s.id === h.staff_id)
          : (agentsData || []).find((a: any) => a.id === h.agent_id)

        return {
          id: h.id,
          receipt_number: h.receipt_number,
          recipient_name: person?.name || "Unknown",
          profile_type: h.person_type,
          settled_date: h.payment_date,
          payment_method: h.payment_method || "bank",
          amount_paid: h.amount_paid,
          person_id: isStaff ? h.staff_id : h.agent_id,
          status: h.status || "paid",
          remarks: h.remarks,
        }
      })

      setPayoutHistory(history)
    } catch (error) {
      console.error("Payouts error:", error)
      toast.error("Failed to load payouts data")
    } finally {
      setLoading(false)
    }
  }, [shopId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Computed ── */
  const filteredHistory = useMemo(() => {
    let filtered = payoutHistory
    if (activeTab !== "all") {
      filtered = filtered.filter((p) => p.profile_type === activeTab)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.recipient_name.toLowerCase().includes(q) ||
          p.receipt_number.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [payoutHistory, activeTab, searchQuery])

  /* ── Actions ── */
  const handleInitiateDisburse = (
    personId: number,
    type: "staff" | "agent",
    amount: number,
    method: PaymentMethod = "bank",
    remarks: string = ""
  ) => {
    if (method === "qr") {
      setPendingPayout({ personId, type, amount, method, remarks })
      setShowQRScanSim(true)
      return
    }
    commitDisburse(personId, type, amount, method, remarks)
  }

  const commitDisburse = async (
    personId: number,
    type: "staff" | "agent",
    amount: number,
    method: PaymentMethod,
    remarks: string
  ) => {
    try {
      const insertData = {
        shop_id: shopId,
        person_type: type,
        amount_paid: amount,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: method.toLowerCase(),
        status: "paid" as const,
        remarks: remarks || `Disbursement settlement of ${type === "staff" ? "Salary" : "Commission"}`,
        [type === "staff" ? "staff_id" : "agent_id"]: personId,
      }

      const { error } = await supabase.from("payouts").insert(insertData)

      if (error) throw error

      toast.success("Disbursement recorded successfully")
      setShowDisburseDialog(false)
      setShowQRScanSim(false)
      setPendingPayout(null)
      fetchData()

      setDisburseSuccessMsg(`Disbursement of ₹${amount.toLocaleString("en-IN")} successfully settled!`)
      setTimeout(() => setDisburseSuccessMsg(""), 5000)
    } catch (err: any) {
      toast.error(err.message || "Failed to disburse")
    }
  }

  const handleReversePayout = async (record: PayoutRecord) => {
    try {
      const { error } = await supabase
        .from("payouts")
        .update({
          status: "reversed",
          remarks: `[REVERSED] ${record.remarks || ""}`,
        })
        .eq("id", record.id)

      if (error) throw error

      toast.success("Settlement reversed successfully")
      setPayoutToReverse(null)
      fetchData()

      setReversalSuccessMsg(`Receipt ${record.receipt_number} has been reversed.`)
      setTimeout(() => setReversalSuccessMsg(""), 5000)
    } catch (err: any) {
      toast.error(err.message || "Failed to reverse")
    }
  }

  /* ── Render Helpers ── */
  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "qr": return <QrCode className="h-3 w-3" />
      case "upi": return <CreditCard className="h-3 w-3" />
      case "bank": return <Building className="h-3 w-3" />
      case "cash": return <Banknote className="h-3 w-3" />
      default: return <Banknote className="h-3 w-3" />
    }
  }

  if (loading) {
    return (
      <MainLayout title="Payouts" subtitle="Manage payouts and commissions" shopId={shopId}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Payouts" subtitle="Manage payouts and commissions" shopId={shopId}>
      <div className="space-y-6">

        {/* ── Success Notifications ── */}
        {disburseSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{disburseSuccessMsg}</span>
          </div>
        )}
        {reversalSuccessMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 text-red-600 shrink-0" />
            <span>{reversalSuccessMsg}</span>
          </div>
        )}

        {/* ── Header Banner ── */}
        <div className="flex items-center justify-between bg-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Settlements & Payouts Ledger</h1>
              <p className="text-sm text-slate-400">
                Disburse earnings to commission agents or monthly staff employees.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowDisburseDialog(true)} className="gap-2 bg-blue-500 hover:bg-blue-600 text-white">
            <Send className="h-4 w-4" />
            Disburse Funds
          </Button>
        </div>

        {/* ── Outstanding Balances Dashboard ── */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Staff Payroll */}
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                    Employee Payroll Due
                  </h3>
                </div>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-0">
                  {staffPayroll.length} PENDING
                </Badge>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {staffPayroll.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                      No payroll due. Generate monthly sheets in the Payroll tab first.
                    </p>
                  </div>
                ) : (
                  staffPayroll.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/50">
                      <div>
                        <p className="font-medium text-white">{staff.name}</p>
                        <p className="text-xs text-slate-400">{staff.role} • {staff.salary_type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-white">₹{staff.pending_salary.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-slate-400">Pending Due</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => {
                            setDisburseType("staff")
                            setSelectedPersonId(staff.id)
                            setDisburseAmount(staff.pending_salary)
                            setDisburseMethod("bank")
                            setDisburseRemarks("")
                            setShowDisburseDialog(true)
                          }}
                        >
                          Disburse
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agent Commissions */}
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                    Agent Commissions Due
                  </h3>
                </div>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-0">
                  {agentCommissions.length} PENDING
                </Badge>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {agentCommissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No pending commissions.</p>
                  </div>
                ) : (
                  agentCommissions.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/50">
                      <div>
                        <p className="font-medium text-white">{agent.name}</p>
                        <p className="text-xs text-slate-400">Reseller Commission Account</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-white">₹{agent.pending_commission.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-slate-400">Unsettled</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => {
                            setDisburseType("agent")
                            setSelectedPersonId(agent.id)
                            setDisburseAmount(agent.pending_commission)
                            setDisburseMethod("bank")
                            setDisburseRemarks("")
                            setShowDisburseDialog(true)
                          }}
                        >
                          Disburse
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search receipt code, recipient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "staff", "agent"] as FilterTab[]).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? "bg-slate-900 text-white hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}
              >
                {tab === "all" ? "All Disbursements" : tab === "staff" ? "Staff Salaries" : "Agent Commissions"}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Payout History Ledger ── */}
        <Card className="bg-white border border-slate-200 overflow-hidden rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Receipt No</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Recipient</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Gateway</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 uppercase text-xs tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 font-mono text-xs">
                        No disbursements logged in this settlement period.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((record) => (
                      <tr key={record.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{record.receipt_number}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{record.recipient_name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={record.profile_type === "staff" ? "border-blue-400 text-blue-600 bg-blue-50" : "border-emerald-400 text-emerald-600 bg-emerald-50"}>
                            {record.profile_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(record.settled_date).toLocaleDateString("en-IN")}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-500 uppercase text-xs font-mono font-semibold">
                            {getMethodIcon(record.payment_method)}
                            {record.payment_method}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">₹{record.amount_paid.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1.5 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100" onClick={() => setSelectedReceipt(record)} title="View Receipt">
                              <Printer className="h-4 w-4" />
                            </Button>
                            {record.status === "paid" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setPayoutToReverse(record)} title="Reverse Settlement">
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {record.status === "reversed" && (
                              <span className="text-[10px] text-red-600 font-mono font-bold uppercase px-2 py-1 bg-red-50 rounded">Reversed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════
            DIALOG: DISBURSE FUNDS FORM
            ═══════════════════════════════════════════════════════ */}
        <Dialog open={showDisburseDialog} onOpenChange={setShowDisburseDialog}>
          <DialogContent className="max-w-lg bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Coins className="h-4 w-4 text-blue-500" />
                Initiate Fund Disbursement
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-5">
              {/* Type Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-medium">Disburse Target Profile</label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDisburseType("staff")}
                    className={`py-2 rounded-md text-xs font-semibold transition-all ${
                      disburseType === "staff"
                        ? "bg-slate-900 text-white shadow-md"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Staff Salaries
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisburseType("agent")}
                    className={`py-2 rounded-md text-xs font-semibold transition-all ${
                      disburseType === "agent"
                        ? "bg-slate-900 text-white shadow-md"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Agent Commissions
                  </button>
                </div>
              </div>

              {/* Person Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-medium">
                  {disburseType === "staff" ? "Select Employee Salary (Approved or Draft)*" : "Select Reseller Agent*"}
                </label>
                <div className="relative">
                  <select
                    className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={selectedPersonId || ""}
                    onChange={(e) => {
                      const id = parseInt(e.target.value)
                      setSelectedPersonId(id)
                      const person = disburseType === "staff"
                        ? staffPayroll.find(s => s.id === id)
                        : agentCommissions.find(a => a.id === id)
                      if (person) {
                        setDisburseAmount(disburseType === "staff" 
                          ? (person as StaffMember).pending_salary 
                          : (person as Agent).pending_commission
                        )
                      }
                    }}
                  >
                    <option value="">-- {disburseType === "staff" ? "Choose Employee Salary" : "Choose Reseller Agent"} --</option>
                    {disburseType === "staff" ? staffPayroll.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Pending Balance: ₹{s.pending_salary.toLocaleString("en-IN")})</option>
                    )) : agentCommissions.map(a => (
                      <option key={a.id} value={a.id}>{a.name} (Pending Balance: ₹{a.pending_commission.toLocaleString("en-IN")})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Payment Method & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 font-medium">Payment Method</label>
                  <div className="relative">
                    <select
                      className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      value={disburseMethod}
                      onChange={(e) => setDisburseMethod(e.target.value as PaymentMethod)}
                    >
                      <option value="bank">Bank Transfer</option>
                      <option value="upi">UPI Address</option>
                      <option value="qr">QR Code</option>
                      <option value="cash">Cash Payment</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 font-medium">Disbursement Amount (₹)</label>
                  <Input
                    type="number"
                    value={disburseAmount}
                    onChange={(e) => setDisburseAmount(Number(e.target.value))}
                    className="h-10 bg-white border-slate-200"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-medium">Internal Reference Remarks</label>
                <Input
                  placeholder="e.g. Settle ledger for June 2026 sales"
                  value={disburseRemarks}
                  onChange={(e) => setDisburseRemarks(e.target.value)}
                  className="h-10 bg-white border-slate-200"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={() => setShowDisburseDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={!selectedPersonId || disburseAmount <= 0}
                  onClick={() => {
                    if (selectedPersonId && disburseAmount > 0) {
                      handleInitiateDisburse(selectedPersonId, disburseType!, disburseAmount, disburseMethod, disburseRemarks)
                    }
                  }}
                >
                  Execute Disbursement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════
            DIALOG: QR SCAN SIMULATION
            ═══════════════════════════════════════════════════════ */}
        <Dialog open={showQRScanSim} onOpenChange={setShowQRScanSim}>
          <DialogContent className="max-w-sm bg-white border-slate-200 text-center">
            <DialogHeader>
              <DialogTitle className="sr-only">QR Payment Simulation</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold uppercase rounded-full tracking-wider mb-2">
                  <Sparkles className="w-3 h-3" /> Dynamic UPI QR
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Simulated QR Transfer</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Scanning for <strong className="text-slate-900">{pendingPayout ? (pendingPayout.type === "staff" 
                    ? staffPayroll.find(s => s.id === pendingPayout.personId)?.name 
                    : agentCommissions.find(a => a.id === pendingPayout.personId)?.name) 
                    : ""}</strong>
                </p>
              </div>

              <div className="relative mx-auto w-48 h-48 bg-white p-3 rounded-2xl border-2 border-slate-200 flex items-center justify-center">
                <QrCode className="w-full h-full text-slate-900" />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500">Settlement Value</div>
                <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  ₹{pendingPayout?.amount.toLocaleString("en-IN") || 0}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={() => { setShowQRScanSim(false); setPendingPayout(null); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => {
                    if (pendingPayout) {
                      commitDisburse(
                        pendingPayout.personId,
                        pendingPayout.type,
                        pendingPayout.amount,
                        pendingPayout.method,
                        pendingPayout.remarks
                      )
                    }
                  }}
                >
                  Simulate Success
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════
            DIALOG: PRINTABLE RECEIPT
            ═══════════════════════════════════════════════════════ */}
        <Dialog open={!!selectedReceipt} onOpenChange={() => { setSelectedReceipt(null); setReceiptCopied(false); }}>
          <DialogContent className="max-w-sm bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="sr-only">Disbursement Receipt</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 relative">
              <div className="text-center border-b border-slate-100 pb-4">
                <span className="text-[10px] text-emerald-600 font-mono tracking-wider font-bold">SETTLED</span>
                <h3 className="text-lg font-bold uppercase tracking-wider mt-1 text-slate-900">{shopName}</h3>
                <p className="text-[10px] text-slate-400 font-mono">Disbursement Receipt Voucher</p>
              </div>

              <div className="grid grid-cols-2 gap-y-3 text-xs border-b border-slate-100 pb-4 font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">Receipt No:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt?.receipt_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Date:</span>
                  <span className="text-slate-900">{selectedReceipt?.settled_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Recipient:</span>
                  <span className="font-sans font-semibold text-slate-900">{selectedReceipt?.recipient_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Role:</span>
                  <Badge variant="outline" className="text-[9px] border-slate-200 text-slate-600">
                    {selectedReceipt?.profile_type}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Gateway:</span>
                  <span className="capitalize text-slate-900">{selectedReceipt?.payment_method}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Status:</span>
                  <span className={`text-[10px] font-bold uppercase ${selectedReceipt?.status === "paid" ? "text-emerald-600" : "text-red-600"}`}>
                    {selectedReceipt?.status}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Net Settlement Paid</span>
                <span className="text-2xl font-bold mt-1.5 block text-slate-900">
                  ₹{selectedReceipt?.amount_paid.toLocaleString("en-IN")}
                </span>
              </div>

              {selectedReceipt?.remarks && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500">
                  <strong className="text-slate-900 block mb-0.5">Remarks:</strong>
                  &ldquo;{selectedReceipt.remarks}&rdquo;
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={() => {
                    const summary = `
=============================================
       DISBURSEMENT RECEIPT VOUCHER
=============================================
Shop: ${shopName}
Receipt: ${selectedReceipt?.receipt_number}
Date: ${selectedReceipt?.settled_date}
Recipient: ${selectedReceipt?.recipient_name} (${selectedReceipt?.profile_type?.toUpperCase()})
Gateway: ${selectedReceipt?.payment_method}
Status: ${selectedReceipt?.status?.toUpperCase()}
---------------------------------------------
Amount: ₹${selectedReceipt?.amount_paid.toLocaleString("en-IN")}
---------------------------------------------
Remarks: ${selectedReceipt?.remarks || "N/A"}
=============================================
`.trim()
                    navigator.clipboard.writeText(summary)
                    setReceiptCopied(true)
                    setTimeout(() => setReceiptCopied(false), 2000)
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {receiptCopied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  className="flex-1 gap-1.5 bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════
            DIALOG: CONFIRM REVERSAL
            ═══════════════════════════════════════════════════════ */}
        <Dialog open={!!payoutToReverse} onOpenChange={() => setPayoutToReverse(null)}>
          <DialogContent className="max-w-sm bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="sr-only">Confirm Reversal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-red-600 border-b border-slate-100 pb-3">
                <RotateCcw className="h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Reverse Settlement</h3>
              </div>

              <p className="text-xs leading-relaxed text-slate-600">
                Reverse receipt <strong className="font-mono text-slate-900">{payoutToReverse?.receipt_number}</strong> of <strong className="text-slate-900">₹{payoutToReverse?.amount_paid.toLocaleString("en-IN")}</strong> paid to <strong className="text-slate-900">{payoutToReverse?.recipient_name}</strong>?
              </p>

              <p className="text-[10px] text-slate-400">
                ⚠️ Auditable action. Restores pending balances and marks receipt as reversed.
              </p>

              <div className="flex gap-2.5 pt-2">
                <Button variant="outline" className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => setPayoutToReverse(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => payoutToReverse && handleReversePayout(payoutToReverse)}
                >
                  Confirm Reversal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  )
}