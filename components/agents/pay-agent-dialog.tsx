"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt, QrCode, Wallet } from "lucide-react"
import QRCode from "qrcode"
import { createClient } from "@/lib/supabase/shop-client"

interface PayAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: number
  agent: any | null
  onPaid: () => void
}

export function PayAgentDialog({ open, onOpenChange, shopId, agent, onPaid }: PayAgentDialogProps) {
  const supabase = createShopClient()
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

  useEffect(() => {
    if (!open || !agent) return

    const fetchSales = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("sales")
          .select("*")
          .eq("shop_id", shopId)
          .eq("agent_id", agent.id)

        if (error) throw error
        setSales(data || [])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSales()
  }, [open, agent, shopId, supabase])

  const pendingAmount = useMemo(() => Number(agent?.pending_commission || 0), [agent])

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
    if (!agent) return
    setIsLoading(true)
    try {
      const amountLabel = Number(amount).toFixed(2)
      let paymentPayload = ""
      let paymentType: "upi" | "bank" | "manual" = "manual"

      if (agent.upi_id) {
        const params = new URLSearchParams({
          pa: agent.upi_id,
          pn: agent.account_name || agent.name,
          am: amountLabel,
          cu: "INR",
          tn: `Agent payout ${agent.name}`,
        })
        paymentPayload = `upi://pay?${params.toString()}`
        paymentType = "upi"
      } else if (agent.account_number || agent.bank_name || agent.ifsc_code) {
        paymentPayload = [
          `Agent payout`,
          `Name: ${agent.account_name || agent.name}`,
          `Account: ${agent.account_number || "-"}`,
          `Bank: ${agent.bank_name || "-"}`,
          `IFSC: ${agent.ifsc_code || "-"}`,
          `Amount: ${amountLabel}`,
        ].join("\n")
        paymentType = "bank"
      } else {
        paymentPayload = [`Agent payout`, `Name: ${agent.name}`, `Amount: ${amountLabel}`].join("\n")
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
    if (!agent || !paymentAmount) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from("payouts").insert({
        shop_id: shopId,
        agent_id: agent.id,
        person_type: "agent",
        amount_paid: Number(paymentAmount),
        payment_date: new Date().toISOString().split("T")[0],
        remarks: paymentMode === "full" ? "Full payout via QR" : `Custom payout via QR (${paymentAmount})`,
      })

      if (error) throw error

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
    <Dialog open={open} onOpenChange={(value) => { if (!value) reset(); onOpenChange(value) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pay Agent</DialogTitle>
        </DialogHeader>

        {!qrValue ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agent</p>
                  <h3 className="text-lg font-semibold">{agent?.name}</h3>
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
              This QR is generated for {agent?.name} using their saved {qrType === "upi" ? "UPI" : qrType === "bank" ? "bank transfer" : "payment"} details.
            </p>
            <div className="mt-3 rounded border bg-background px-3 py-2 text-sm font-medium text-foreground">
              QR expires in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
            {qrImage ? <img src={qrImage} alt="Agent payout QR" className="mx-auto mt-4 h-48 w-48 rounded border bg-white p-2" /> : null}
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