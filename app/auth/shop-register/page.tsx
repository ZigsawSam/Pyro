"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ShopRegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [shopName, setShopName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleRegister = async () => {
    setLoading(true)
    setError("")

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "shop_owner" } },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError("Registration failed — no user returned")
        setLoading(false)
        return
      }

      // 2. Sign in immediately to get an active session (needed for RLS insert)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError("Account created but auto-login failed. Please log in manually.")
        setLoading(false)
        router.push("/auth/shop-login")
        return
      }

      // 3. Insert shop with user_id (now we have an active session)
      const { data: shopInsert, error: dbError } = await supabase
        .from("shops")
        .insert({
          user_id: authData.user.id,
          shop_name: shopName,
          owner_name: ownerName,
          phone,
          email,
          city,
          state,
        })
        .select("id")
        .single()

      if (dbError) {
        setError(dbError.message)
        setLoading(false)
        return
      }

      // 4. Redirect to the new shop dashboard
      if (shopInsert?.id) {
        router.push(`/shop/${shopInsert.id}/dashboard`)
      } else {
        router.push("/")
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-bold">Register Your Shop</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <Input placeholder="Shop Name" value={shopName} onChange={e => setShopName(e.target.value)} />
        <Input placeholder="Owner Name" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
        <Input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
        <Input placeholder="State" value={state} onChange={e => setState(e.target.value)} />
        <Button onClick={handleRegister} disabled={loading} className="w-full">
          {loading ? <Loader2 className="animate-spin mr-2" /> : null}
          Register Shop
        </Button>
      </Card>
    </div>
  )
}