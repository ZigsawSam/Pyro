"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/data-table"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Commission {
  sale_id: number
  shop_name: string
  amount: number
  commission_amount: number
  sale_date: string
  paid: boolean
}

interface AgentData {
  id: number
  uniqueId: string
  name: string
  phoneNumber: string
}

function CommissionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shopId = searchParams.get("shop_id")
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [shopName, setShopName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!shopId) return

    const fetchCommissions = async () => {
      try {
        const agentSession = localStorage.getItem("agent_session")
        if (!agentSession) {
          router.push("/auth/agent-login")
          return
        }

        let agent: AgentData
        try {
          agent = JSON.parse(agentSession)
          if (!agent || !agent.id) throw new Error("Invalid agent session data")
        } catch (parseErr) {
          console.error("[v0] Parse error:", parseErr)
          localStorage.removeItem("agent_session")
          localStorage.removeItem("agent_token")
          router.push("/auth/agent-login")
          return
        }

        const response = await fetch(`/api/agents/${agent.id}/commissions?shop_id=${shopId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("agent_token")}`,
          },
        })

        if (!response.ok) throw new Error("Failed to fetch commissions")

        const data = await response.json()
        setCommissions(data.commissions)
        setShopName(data.shop_name)
      } catch (error) {
        console.error("Error:", error)
        setError("Failed to load commissions. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCommissions()
  }, [shopId, router])

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
