"use client"

import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { ComingSoon } from "@/components/dashboard/shop/ComingSoon"

export default function InventoryPage() {
  const params = useParams()
  const shopId = Number(params?.shopId)

  return (
    <MainLayout title="Inventory" shopId={shopId} isAgent={false}>
      <ComingSoon
        title="Inventory Management"
        description="Track stock levels, manage products, and get low-stock alerts. This feature is coming in the next update."
        backHref={`/shop/${shopId}/dashboard`}
        backLabel="Back to Dashboard"
      />
    </MainLayout>
  )
}
