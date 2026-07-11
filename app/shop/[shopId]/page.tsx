import { redirect } from "next/navigation"

export default function ShopIndexPage({ params }: { params: { shopId: string } }) {
  redirect(`/shop/${params.shopId}/dashboard`)
}
