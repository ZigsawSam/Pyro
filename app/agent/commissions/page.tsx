"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/data-table"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Commission {
  sale_id: number
  shop_name: string
  amount: number
  commission_amount: number
  sale_date: string
  paid: boolean
}

function CommissionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const shopId = searchParams.get("shop_id")
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [shopName, setShopName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!shopId) return

    const fetchCommissions = async () => {
      try {
        // Get current agent user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/agent-login")
          return
        }

        // Get agent profile
        const { data: agent } = await supabase
          .from("agents")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (!agent) {
          router.push("/auth/agent-login")
          return
        }

        // Fetch sales with commission for this agent + shop
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("id, amount, commission_amount, sale_date, shops:shop_id(shop_name)")
          .eq("agent_id", agent.id)
          .eq("shop_id", Number(shopId))
          .order("sale_date", { ascending: false })

        if (salesError) throw salesError

        // Fetch payouts to determine paid status
        const { data: payoutsData } = await supabase
          .from("payouts")
          .select("id")
          .eq("shop_id", Number(shopId))
          .eq("person_id", agent.id)
          .eq("person_type", "agent")

        const paidSaleIds = new Set((payoutsData || []).map((p: any) => p.id))

        const formattedCommissions: Commission[] = (salesData || []).map((sale: any) => ({
          sale_id: sale.id,
          shop_name: sale.shops?.shop_name || "Unknown Shop",
          amount: Number(sale.amount || 0),
          commission_amount: Number(sale.commission_amount || 0),
          sale_date: sale.sale_date,
          paid: paidSaleIds.has(sale.id),
        }))

        setCommissions(formattedCommissions)
        
        // Get shop name
        const { data: shopData } = await supabase
          .from("shops")
          .select("shop_name")
          .eq("id", Number(shopId))
          .single()
        
        setShopName(shopData?.shop_name || "")
      } catch (error: any) {
        console.error("Error:", error)
        setError(error.message || "Failed to load commissions. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCommissions()
  }, [shopId, router, supabase])

  const columns = [
    {
      key: "sale_date",
      label: "Date",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: "amount",
      label: "Sale Amount",
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: "commission_amount",
      label: "Commission",
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      key: "paid",
      label: "Status",
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            value ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {value ? "Paid" : "Pending"}
        </span>
      ),
    },
  ]

  if (error && !isLoading) {
    return (
      <MainLayout title="Commission Details" isAgent={true}>
        <Card className="p-6 border-l-4 border-l-destructive bg-destructive/5">
          <p className="text-destructive font-semibold">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </Card>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Commission Details" isAgent={true}>
      <Button variant="outline" onClick={() => router.back()} className="mb-6 gap-2">
        <ArrowLeft size={18} />
        Back
      </Button>

      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-bold text-foreground">{shopName || "Commission Details"}</h2>
        <p className="text-muted-foreground mt-1">Your commission history</p>
      </Card>

      <Card className="p-6">
        <DataTable columns={columns} data={commissions} isLoading={isLoading} />
      </Card>
    </MainLayout>
  )
}

export default function CommissionsPage() {
  return (
    <Suspense
      fallback={
        <MainLayout title="Commission Details" isAgent={true}>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </MainLayout>
      }
    >
      <CommissionsContent />
    </Suspense>
  )
}