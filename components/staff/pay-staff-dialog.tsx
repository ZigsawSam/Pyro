"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt, QrCode, Wallet, CalendarDays, Clock } from "lucide-react"
import QRCode from "qrcode"
import { createShopClient } from "@/lib/supabase/shop-client"

interface PayStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: number
  staff: {
    id: number
    name: string
    pending_salary?: number
    pending_payroll?: number
    account_name?: string
    account_number?: string
    bank_name?: string
    ifsc_code?: string
    upi_id?: string
  } | null
  onPaid: () => void
}

interface AttendanceRecord {
  id: number
  attendance_date: string
  status: string
  work_hours: number
  overtime_hours: number
}

export function PayStaffDialog({ open, onOpenChange, shopId, staff, onPaid }: PayStaffDialogProps) {
  const supabase = createShopClient()
  const [isLoading, setIsLoading] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [showStatement, setShowStatement] = useState(false)
  const [paymentMode, setPaymentMode] = useState<"full" | "custom" | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [qrValue, setQrValue] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [qrType, setQrType] = useState<"upi" | "bank" | "manual">("manual")
  const [timeLeft, setTimeLeft] = useState(300)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Accept both pending_salary and pending_payroll for backward compatibility
  const pendingAmount = useMemo(() => {
    return Number(staff?.pending_salary || staff?.pending_payroll || 0)
  }, [staff])

  useEffect(() => {
    if (!open || !staff) return

    const fetchAttendance = async () => {
      setIsLoading(true)
      try {
        const now = new Date()
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
        
        const { data, error } = await supabase
          .from("attendance")
          .select("id, attendance_date, status, work_hours, overtime_hours")
          .eq("shop_id", shopId)
          .eq("staff_id", staff.id)
          .gte("attendance_date", monthStart)
          .order("attendance_date", { ascending: false })

        if (error) throw error
        setAttendance(data || [])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAttendance()
  }, [open, staff, shopId, supabase])

  const reset = () => {
    setPaymentMode(null)
    setCustomAmount("")
    setQrValue(null)
    setQrImage(null)
    setQrType("manual")
    setTimeLeft(300)
    setPaymentAmount(0)
    setPaymentCompleted(false)
    setShowStatement(false)
    setErrorMsg(null)
  }

  useEffect(() => {
    if (!qrValue || paymentCompleted) return

    if (timeLeft <= 0) {
      reset()
      onOpenChange(false)
      return
    }

    const timer = window.setTimeout(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [qrValue, timeLeft, paymentCompleted, onOpenChange])

  const handleCreatePayout = async (amount: number) => {
    if (!staff) return
    setIsLoading(true)
    try {
      const amountLabel = Number(amount).toFixed(2)
      let paymentPayload = ""
      let paymentType: "upi" | "bank" | "manual" = "manual"

      if (staff.upi_id) {
        const params = new URLSearchParams({
          pa: staff.upi_id,
          pn: staff.account_name || staff.name,
          am: amountLabel,
          cu: "INR",
          tn: `Staff payout ${staff.name}`,
        })
        paymentPayload = `upi://pay?${params.toString()}`
        paymentType = "upi"
      } else if (staff.account_number || staff.bank_name || staff.ifsc_code) {
        paymentPayload = [
          `Staff payout`,
          `Name: ${staff.account_name || staff.name}`,
          `Account: ${staff.account_number || "-"}`,
          `Bank: ${staff.bank_name || "-"}`,
          `IFSC: ${staff.ifsc_code || "-"}`,
          `Amount: ${amountLabel}`,
        ].join("\\n")
        paymentType = "bank"
      } else {
        paymentPayload = [`Staff payout`, `Name: ${staff.name}`, `Amount: ${amountLabel}`].join("\\n")
      }

      const generatedQr = await QRCode.toDataURL(paymentPayload)
      setPaymentAmount(amount)
      setTimeLeft(300)
      setQrValue(paymentPayload)
      setQrImage(generatedQr)
      setQrType(paymentType)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayFull = () => {
    setPaymentMode("full")
    handleCreatePayout(pendingAmount)
  }

  const handlePayCustom = () => {
    const amount = Number(customAmount)
    if (!amount || amount <= 0) return
    setPaymentMode("custom")
    handleCreatePayout(amount)
  }

  const handleConfirmPayment = async () => {
    if (!staff || !paymentAmount) return

    setIsLoading(true)
    setErrorMsg(null)
    try {
      const { error } = await supabase.from("payouts").insert({
        shop_id: shopId,
        person_type: "staff",
        staff_id: staff.id,
        amount_paid: paymentAmount,
        payment_date: new Date().toISOString().split("T")[0],
        remarks: paymentMode === "full" ? "Full payout via QR" : `Custom payout via QR (${paymentAmount})`,
      })

      if (error) throw error

      setPaymentCompleted(true)
      onPaid()
      reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error(error)
      setErrorMsg(error.message || "Failed to create payout")
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate attendance summary
  const presentDays = attendance.filter(a => a.status === "present").length
  const halfDays = attendance.filter(a => a.status === "half").length
  const absentDays = attendance.filter(a => a.status === "absent").length
  const totalWorkHours = attendance.reduce((sum, a) => sum + Number(a.work_hours || 0), 0)
  const totalOvertime = attendance.reduce((sum, a) => sum + Number(a.overtime_hours || 0), 0)

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) reset(); onOpenChange(value) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pay Staff Member</DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {!qrValue ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staff Member</p>
                  <h3 className="text-lg font-semibold">{staff?.name}</h3>
                </div>
                <Badge variant="secondary">Pending ₹{pendingAmount.toLocaleString()}</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowStatement((v) => !v)} variant="outline" className="gap-2">
                <Receipt className="h-4 w-4" />
                {showStatement ? "Hide Statement" : "Show Statement"}
              </Button>
            </div>

            {showStatement ? (
              <div className="rounded-lg border p-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : attendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attendance recorded this month.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="rounded bg-green-50 p-2 text-center">
                        <p className="font-bold text-green-700">{presentDays}</p>
                        <p className="text-xs text-green-600">Present</p>
                      </div>
                      <div className="rounded bg-yellow-50 p-2 text-center">
                        <p className="font-bold text-yellow-700">{halfDays}</p>
                        <p className="text-xs text-yellow-600">Half Day</p>
                      </div>
                      <div className="rounded bg-red-50 p-2 text-center">
                        <p className="font-bold text-red-700">{absentDays}</p>
                        <p className="text-xs text-red-600">Absent</p>
                      </div>
                      <div className="rounded bg-blue-50 p-2 text-center">
                        <p className="font-bold text-blue-700">{totalWorkHours}h</p>
                        <p className="text-xs text-blue-600">Hours</p>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {attendance.map((record) => (
                        <div key={record.id} className="flex items-center justify-between rounded border p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-3 w-3 text-muted-foreground" />
                            <span>{record.attendance_date}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              record.status === "present" ? "bg-green-100 text-green-700" :
                              record.status === "half" ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {record.status}
                            </span>
                            <span className="text-xs text-muted-foreground">{record.work_hours}h</span>
                            {record.overtime_hours > 0 && (
                              <span className="text-xs text-orange-600">+{record.overtime_hours}h OT</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">Choose payment option</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePayFull} disabled={isLoading || pendingAmount <= 0} className="gap-2">
                  <Wallet className="h-4 w-4" />
                  Pay Full (₹{pendingAmount.toLocaleString()})
                </Button>
                <Button onClick={() => setPaymentMode("custom")} variant="outline" className="gap-2">
                  <QrCode className="h-4 w-4" />
                  Pay Custom Amount
                </Button>
              </div>

              {paymentMode === "custom" ? (
                <div className="mt-4 space-y-2">
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                  />
                  <Button onClick={handlePayCustom} disabled={isLoading || !customAmount} className="w-full">
                    Generate QR
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-6 text-center">
            <QrCode className="mx-auto mb-3 h-10 w-10" />
            <h3 className="text-lg font-semibold">Payment QR Ready</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This QR is generated for {staff?.name} using their saved {qrType === "upi" ? "UPI" : qrType === "bank" ? "bank transfer" : "payment"} details.
            </p>
            <div className="mt-3 rounded border bg-background px-3 py-2 text-sm font-medium text-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              QR expires in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
            {qrImage ? <img src={qrImage} alt="Staff payout QR" className="mx-auto mt-4 h-48 w-48 rounded border bg-white p-2" /> : null}
            <div className="mt-4 rounded border bg-background p-3 text-left text-xs">
              <p className="font-semibold">Payment details</p>
              <p className="mt-2 whitespace-pre-wrap break-all">{qrValue}</p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={handleConfirmPayment} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Payment Done
              </Button>
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}