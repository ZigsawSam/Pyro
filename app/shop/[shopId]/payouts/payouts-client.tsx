"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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
  ChevronDown,
} from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { createShopClient } from "@/lib/supabase/shop-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import QRCode from "qrcode"

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
  receipt_no: string
  recipient_name: string
  profile_type: "staff" | "agent"
  settled_date: string
  payment_gateway: string
  amount_paid: number
  person_id: number
}

interface PayoutsClientProps {
  shopId: string
  user?: any
}

type FilterTab = "all" | "staff" | "agent"

export function ShopPayoutsPage({ shopId: shopIdProp, user }: PayoutsClientProps) {
  const shopId = parseInt(shopIdProp, 10)
  const supabase = createShopClient()

  const [staffPayroll, setStaffPayroll] = useState<StaffMember[]>([])
  const [agentCommissions, setAgentCommissions] = useState<Agent[]>([])
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [showDisburseDialog, setShowDisburseDialog] = useState(false)
  const [disburseType, setDisburseType] = useState<"staff" | "agent" | null>(null)

  // Fetch all data
  const fetchData = async () => {
    if (isNaN(shopId)) return
    setLoading(true)
    try {
      // 1. Fetch staff with pending salary
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, role, salary_type, base_salary, working_hours_per_day, overtime_rate")
        .eq("shop_id", shopId)
        .eq("is_active", true)

      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
      const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

      // Get attendance for this month
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("staff_id, status, work_hours, overtime_hours")
        .eq("shop_id", shopId)
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd)

      // Get payouts for this month
      const { data: staffPayouts } = await supabase
        .from("payouts")
        .select("staff_id, amount_paid")
        .eq("shop_id", shopId)
        .eq("person_type", "staff")
        .gte("payment_date", monthStart)
        .lte("payment_date", monthEnd)

      const payoutsMap: Record<number, number> = {}
      ;(staffPayouts || []).forEach((p: any) => {
        payoutsMap[p.staff_id] = (payoutsMap[p.staff_id] || 0) + Number(p.amount_paid || 0)
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

      // 2. Fetch agents with pending commission
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
        .select("agent_id, amount_paid")
        .eq("shop_id", shopId)
        .eq("person_type", "agent")

      const salesMap: Record<number, number> = {}
      ;(salesData || []).forEach((s: any) => {
        salesMap[s.agent_id] = (salesMap[s.agent_id] || 0) + Number(s.commission_amount || 0)
      })

      const agentPayoutsMap: Record<number, number> = {}
      ;(agentPayouts || []).forEach((p: any) => {
        agentPayoutsMap[p.agent_id] = (agentPayoutsMap[p.agent_id] || 0) + Number(p.amount_paid || 0)
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

      // 3. Fetch payout history
      const { data: historyData } = await supabase
        .from("payouts")
        .select("id, staff_id, agent_id, person_type, amount_paid, payment_date, payment_method, remarks")
        .eq("shop_id", shopId)
        .order("payment_date", { ascending: false })
        .limit(50)

      const history: PayoutRecord[] = (historyData || []).map((h: any, idx: number) => {
        const isStaff = h.person_type === "staff"
        const person = isStaff
          ? (staffData || []).find((s: any) => s.id === h.staff_id)
          : (agentsData || []).find((a: any) => a.id === h.agent_id)
        
        return {
          id: h.id,
          receipt_no: `REC-${32810 + idx}`,
          recipient_name: person?.name || "Unknown",
          profile_type: h.person_type,
          settled_date: h.payment_date,
          payment_gateway: h.payment_method || "BANK",
          amount_paid: h.amount_paid,
          person_id: isStaff ? h.staff_id : h.agent_id,
        }
      })

      setPayoutHistory(history)
    } catch (error) {
      console.error("Payouts error:", error)
      toast.error("Failed to load payouts data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [shopId])

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
          p.receipt_no.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [payoutHistory, activeTab, searchQuery])

  const totalStaffPending = staffPayroll.reduce((sum, s) => sum + s.pending_salary, 0)
  const totalAgentPending = agentCommissions.reduce((sum, a) => sum + a.pending_commission, 0)

  const handleDisburse = async (personId: number, type: "staff" | "agent", amount: number) => {
    try {
      const { error } = await supabase.from("payouts").insert({
        shop_id: shopId,
        [type === "staff" ? "staff_id" : "agent_id"]: personId,
        person_type: type,
        amount_paid: amount,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "BANK",
        remarks: "Disbursed via ledger",
      })

      if (error) throw error
      toast.success("Disbursement recorded successfully")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to disburse")
    }
  }

  if (loading) {
    return (
      <MainLayout title="Payouts" subtitle="Manage payouts and commissions" shopId={shopId}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Payouts" subtitle="Manage payouts and commissions" shopId={shopId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-card rounded-xl p-6 border">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Settlements & Payouts Ledger</h1>
              <p className="text-sm text-muted-foreground">
                Disburse earnings to commission agents or monthly staff employees.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowDisburseDialog(true)} className="gap-2">
            <Banknote className="h-4 w-4" />
            Disburse Funds
          </Button>
        </div>

        {/* Outstanding Balances */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Employee Payroll Due */}
          <Card className="bg-card border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-500">
                    Employee Payroll Due
                  </h3>
                </div>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                  {staffPayroll.length} PENDING
                </Badge>
              </div>
              
              {staffPayroll.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No payroll due. Generate monthly sheets in the Payroll tab first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staffPayroll.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">{staff.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{staff.pending_salary.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Unsettled</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Commissions Due */}
          <Card className="bg-card border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-500">
                    Agent Commissions Due
                  </h3>
                </div>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">
                  {agentCommissions.length} PENDING
                </Badge>
              </div>

              {agentCommissions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pending commissions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agentCommissions.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">Reseller Commission Account</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold">₹{agent.pending_commission.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Unsettled</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleDisburse(agent.id, "agent", agent.pending_commission)}
                        >
                          Disburse
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search receipt code, recipient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              All Disbursements
            </Button>
            <Button
              variant={activeTab === "staff" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("staff")}
            >
              Staff Salaries
            </Button>
            <Button
              variant={activeTab === "agent" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("agent")}
            >
              Agent Commissions
            </Button>
          </div>
        </div>

        {/* Payout History Table */}
        <Card className="bg-card border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Receipt No
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Recipient Name
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Profile Type
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Settled Date
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Payment Gateway
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Disbursed Amount
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No disbursements found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((record) => (
                      <tr key={record.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{record.receipt_no}</td>
                        <td className="px-4 py-3 font-medium">{record.recipient_name}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              record.profile_type === "staff"
                                ? "border-blue-500 text-blue-500 bg-blue-500/10"
                                : "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                            }
                          >
                            {record.profile_type === "staff" ? "STAFF" : "AGENT"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(record.settled_date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            {record.payment_gateway === "UPI" ? (
                              <QrCode className="h-3 w-3" />
                            ) : (
                              <Banknote className="h-3 w-3" />
                            )}
                            {record.payment_gateway}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          ₹{record.amount_paid.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
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
      </div>

      {/* Disburse Dialog */}
      <Dialog open={showDisburseDialog} onOpenChange={setShowDisburseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Disburse Funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={disburseType === "staff" ? "default" : "outline"}
                className="h-20 flex-col gap-2"
                onClick={() => setDisburseType("staff")}
              >
                <Users className="h-6 w-6" />
                Staff Salary
              </Button>
              <Button
                variant={disburseType === "agent" ? "default" : "outline"}
                className="h-20 flex-col gap-2"
                onClick={() => setDisburseType("agent")}
              >
                <UserCircle className="h-6 w-6" />
                Agent Commission
              </Button>
            </div>
            
            {disburseType === "staff" && (
              <div className="space-y-2">
                {staffPayroll.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-xs text-muted-foreground">{staff.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">₹{staff.pending_salary.toLocaleString()}</span>
                      <Button size="sm" onClick={() => handleDisburse(staff.id, "staff", staff.pending_salary)}>
                        Pay
                      </Button>
                    </div>
                  </div>
                ))}
                {staffPayroll.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No pending staff payroll.</p>
                )}
              </div>
            )}

            {disburseType === "agent" && (
              <div className="space-y-2">
                {agentCommissions.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.phone_number}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">₹{agent.pending_commission.toLocaleString()}</span>
                      <Button size="sm" onClick={() => handleDisburse(agent.id, "agent", agent.pending_commission)}>
                        Pay
                      </Button>
                    </div>
                  </div>
                ))}
                {agentCommissions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No pending agent commissions.</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
