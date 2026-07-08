"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt, QrCode, Wallet } from "lucide-react"
import QRCode from "qrcode"

interface PayStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: number
  staff: any | null
  onPaid: () => void
}

export function PayStaffDialog({ open, onOpenChange, shopId, staff, onPaid }: PayStaffDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [sales, setSales] = useState<any[]>([])
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

  useEffect(() => {
    if (!open || !staff) return

    const fetchSales = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/shops/${shopId}/sales`)
        if (!response.ok) throw new Error("Failed to load sales")
        const data = await response.json()
        const staffSales = (data.sales || []).filter((sale: any) => sale.staff_id === staff.id)
        setSales(staffSales)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSales()
  }, [open, staff, shopId])

  const pendingAmount = useMemo(() => Number(staff?.pending_payroll || 0), [staff])

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
        ].join("\n")
        paymentType = "bank"
      } else {
        paymentPayload = [`Staff payout`, `Name: ${staff.name}`, `Amount: ${amountLabel}`].join("\n")
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
      const response = await fetch(`/api/shops/${shopId}/payouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          person_type: "staff",
          person_id: staff.id,
          amount_paid: paymentAmount,
          remarks: paymentMode === "full" ? "Full payout via QR" : `Custom payout via QR (${paymentAmount})`,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        let errData: any = {}
        try { errData = JSON.parse(text) } catch { /* not JSON */ }
        console.error("API Error:", response.status, text, errData)
        throw new Error(
          errData.details || errData.error || text || `Failed to create payout: ${response.status}`
        )
      }

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
                ) : sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between rounded border p-2 text-sm">
                        <span>{sale.sale_date}</span>
                        <span className="font-medium">₹{Number(sale.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">Choose payment option</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePayFull} disabled={isLoading || pendingAmount <= 0} className="gap-2">
                  <Wallet className="h-4 w-4" />
                  Pay Full
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