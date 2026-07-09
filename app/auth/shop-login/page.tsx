"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createShopClient } from "@/lib/supabase/shop-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ShopLoginPage() {
  const router = useRouter()
  const supabase = createShopClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !data.user) {
      setError(authError?.message || "Invalid credentials")
      setLoading(false)
      return
    }

    // Fetch the shop for this user
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id")
      .eq("user_id", data.user.id)
      .single()

    if (shopError || !shop) {
      setError("No shop found for this account. Please register.")
      setLoading(false)
      return
    }

    router.push(`/shop/${shop.id}/dashboard`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-bold">Shop Login</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <Button onClick={handleLogin} disabled={loading} className="w-full">
          {loading ? <Loader2 className="animate-spin mr-2" /> : null}
          Login
        </Button>
      </Card>
    </div>
  )
}