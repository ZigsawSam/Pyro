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

    try {
      // Race against timeout to fix Supabase hanging promise bug on Vercel
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("LOGIN_TIMEOUT")), 10000)
      )

      let result: any
      try {
        result = await Promise.race([loginPromise, timeoutPromise])
      } catch (timeoutErr: any) {
        if (timeoutErr.message === "LOGIN_TIMEOUT") {
          // Check if session was actually created despite promise hanging
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData?.session) {
            console.log("Session exists despite timeout — login succeeded")
            result = { 
              data: { 
                session: sessionData.session, 
                user: sessionData.session.user 
              }, 
              error: null 
            }
          } else {
            throw new Error("Login timed out. Please try again.")
          }
        } else {
          throw timeoutErr
        }
      }

      if (result.error || !result.data?.user) {
        setError(result.error?.message || "Invalid credentials")
        setLoading(false)
        return
      }

      // Fetch the shop for this user
      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("id")
        .eq("user_id", result.data.user.id)
        .single()

      if (shopError || !shop) {
        setError("No shop found for this account. Please register.")
        setLoading(false)
        return
      }

window.location.href = `/shop/${shop.id}/dashboard`    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Login failed")
      setLoading(false)
    }
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