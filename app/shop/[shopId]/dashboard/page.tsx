"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { StatCard } from "@/components/stat-card"
import { Card } from "@/components/ui/card"
import { Users, TrendingUp, Clock, UserCheck } from "lucide-react"

interface DashboardData {
  total_sales: number
  pending_commission: number
  paid_commission: number
  total_staff: number
  pending_salary: number
  attendance_today: number
}

export default function ShopDashboardPage() {
  const params = useParams()
  const shopId = params.shopId as string
  const [data, setData] = useState<DashboardData | null>(null)
  const [shopName, setShopName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const fetchDashboard = async () => {
      try {
        const response = await fetch(`/api/shops/${shopId}/dashboard`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch dashboard")
        }

        const result = await response.json()
        setData(result.data || {
          total_sales: 0,
          pending_commission: 0,
          paid_commission: 0,
          total_staff: 0,
          pending_salary: 0,
          attendance_today: 0,
        })
        setShopName(result.shopName || "Shop Dashboard")
      } catch (error) {
        setData({
          total_sales: 0,
          pending_commission: 0,
          paid_commission: 0,
          total_staff: 0,
          pending_salary: 0,
          attendance_today: 0,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [shopId, isMounted])

  if (!isMounted || isLoading) {
    return (
      <MainLayout title="Dashboard" shopId={Number(shopId)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Welcome back to your shop dashboard"
      shopId={Number(shopId)}
      shopName={shopName}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="Total Sales"
          value={`₹${(data?.total_sales || 0).toLocaleString()}`}
          variant="primary"
          icon={<TrendingUp size={24} />}
        />
        <StatCard
          label="Pending Commission"
          value={`₹${(data?.pending_commission || 0).toLocaleString()}`}
          variant="secondary"
          icon={<Clock size={24} />}
        />
        <StatCard
          label="Paid Commission"
          value={`₹${(data?.paid_commission || 0).toLocaleString()}`}
          variant="accent"
          icon={<TrendingUp size={24} />}
        />
        <StatCard label="Total Staff" value={data?.total_staff || 0} variant="primary" icon={<Users size={24} />} />
        <StatCard
          label="Pending Salary"
          value={`₹${(data?.pending_salary || 0).toLocaleString()}`}
          variant="secondary"
          icon={<Clock size={24} />}
        />
        <StatCard
          label="Present Today"
          value={data?.attendance_today || 0}
          variant="accent"
          icon={<UserCheck size={24} />}
        />
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Recent Activity</h2>
        <p className="text-muted-foreground">Activity feed coming soon</p>
      </Card>
    </MainLayout>
  )
}