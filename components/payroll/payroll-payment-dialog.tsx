"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt, QrCode, Wallet, CheckCircle2 } from "lucide-react"
import QRCode from "qrcode"
import { getShopToken } from "@/lib/storage-utils"

interface PayrollPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: number
  salary: any | null
  onPaid: () => void
}

export function PayrollPaymentDialog({ open, onOpenChange, shopId, salary, onPaid }: PayrollPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMode, setPaymentMode] = useState<"full" | "custom" | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [qrValue, setQrValue] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [qrType, setQrType] = useState<"upi" | "bank" | "manual">("manual")
  const [timeLeft, setTimeLeft] = useState(300)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentCompleted, setPaymentCompleted] = useState(false)

  const pendingAmount = useMemo(() => Number(salary?.final_payable || 0), [salary])

  useEffect(() => {
    if (!qrValue || paymentCompleted) return
    if (timeLeft <= 0) {
      setQrValue(null)
      setQrImage(null)
      setQrType("manual")
      setPaymentAmount(0)
      setTimeLeft(300)
      onOpenChange(false)
      return
    }
    const timer = window.setTimeout(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [qrValue, timeLeft, paymentCompleted, onOpenChange])

  const reset = () => {
    setPaymentMode(null)
    setCustomAmount("")
    setQrValue(null)
    setQrImage(null)
    setQrType("manual")
    setTimeLeft(300)
    setPaymentAmount(0)
    setPaymentCompleted(false)
  }

  const handleCreatePayment = async (amount: number) => {
    if (!salary) return
    setIsLoading(true)
    try {
      const amountLabel = Number(amount).toFixed(2)
      let paymentPayload = ""
      let paymentType: "upi" | "bank" | "manual" = "manual"
      const accountName = salary.account_name || salary.staff_name || "Staff"

      if (salary.upi_id) {
        const params = new URLSearchParams({
          pa: salary.upi_id,
          pn: accountName,
          am: amountLabel,
          cu: "INR",
          tn: `Payroll ${salary.staff_name}`,
        })
        paymentPayload = `upi://pay?${params.toString()}`
        paymentType = "upi"
      } else if (salary.account_number || salary.bank_name || salary.ifsc_code) {
        paymentPayload = [
          `Payroll payout`,
          `Name: ${accountName}`,
          `Account: ${salary.account_number || "-"}`,
          `Bank: ${salary.bank_name || "-"}`,
          `IFSC: ${salary.ifsc_code || "-"}`,
          `Amount: ${amountLabel}`,
        ].join("\n")
        paymentType = "bank"
      } else {
        paymentPayload = [`Payroll payout`, `Name: ${salary.staff_name}`, `Amount: ${amountLabel}`].join("\n")
      }

      const generatedQr = await QRCode.toDataURL(paymentPayload)
      setPaymentAmount(amount)
      setQrValue(paymentPayload)
      setQrImage(generatedQr)
      setQrType(paymentType)
      setTimeLeft(300)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayFull = () => {
    setPaymentMode("full")
    handleCreatePayment(pendingAmount)
  }

  const handlePayCustom = () => {
    const amount = Number(customAmount)
    if (!amount || amount <= 0) return
    setPaymentMode("custom")
    handleCreatePayment(amount)
  }

  const handleConfirmPayment = async () => {
    if (!salary || !paymentAmount) return
    setIsLoading(true)
    try {
      const token = getShopToken()
      const response = await fetch(`/api/shops/${shopId}/salary/${salary.id}/mark-paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
      })
      if (!response.ok) throw new Error("Failed to confirm payment")
      setPaymentCompleted(true)
      onPaid()
      reset()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) { reset(); onOpenChange(false) } else onOpenChange(true) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pay Salary</DialogTitle>
        </DialogHeader>

        {!qrValue ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <h3 className="text-lg font-semibold">{salary?.staff_name}</h3>
                </div>
                <Badge variant="secondary">Pending ₹{pendingAmount.toLocaleString()}</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">Choose payment option</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePayFull} disabled={isLoading || pendingAmount <= 0} className="gap-2">
                  <Wallet className="h-4 w-4" /> Pay Full
                </Button>
                <Button onClick={() => setPaymentMode("custom")} variant="outline" className="gap-2">
                  <QrCode className="h-4 w-4" /> Pay Custom Amount
                </Button>
              </div>

              {paymentMode === "custom" ? (
                <div className="mt-4 space-y-2">
                  <Input type="number" placeholder="Enter amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
                  <Button onClick={handlePayCustom} disabled={isLoading || !customAmount} className="w-full">Generate QR</Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-6 text-center">
            <QrCode className="mx-auto mb-3 h-10 w-10" />
            <h3 className="text-lg font-semibold">Payment QR Ready</h3>
            <p className="mt-2 text-sm text-muted-foreground">This QR is prepared for {salary?.staff_name} using their saved {qrType === "upi" ? "UPI" : qrType === "bank" ? "bank transfer" : "payment"} details.</p>
            <div className="mt-3 rounded border bg-background px-3 py-2 text-sm font-medium text-foreground">QR expires in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</div>
            {qrImage ? <img src={qrImage} alt="Payroll payment QR" className="mx-auto mt-4 h-48 w-48 rounded border bg-white p-2" /> : null}
            <div className="mt-4 rounded border bg-background p-3 text-left text-xs">
              <p className="font-semibold">Payment details</p>
              <p className="mt-2 whitespace-pre-wrap break-all">{qrValue}</p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={handleConfirmPayment} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
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
