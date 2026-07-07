"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle } from "lucide-react"

export default function ShopLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (!email.trim()) {
        setError("Please enter your email")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/auth/shop-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        try {
          const data = await response.json()
          setError(data.error || "Login failed")
        } catch {
          setError("Login failed - server error")
        }
        setIsLoading(false)
        return
      }

      let data
      try {
        data = await response.json()
      } catch {
        setError("Invalid server response")
        setIsLoading(false)
        return
      }

      if (!data.shop || !data.shop.id) {
        setError("Invalid login response")
        setIsLoading(false)
        return
      }

      localStorage.setItem("shop_session", JSON.stringify(data.shop))
      localStorage.setItem("shop_token", data.token || "")
      
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300))
      router.push(`/shop/${data.shop.id}/dashboard`)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Shop Owner</h1>
          <p className="text-muted-foreground mt-2">Login to your dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <Input
              type="email"
              placeholder="shop@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Demo email: admin@tiles.com
        </div>
      </Card>
    </div>
  )
}
