"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function ShopRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (!formData.shopName || !formData.ownerName || !formData.email || !formData.phone) {
        setError("Please fill in all required fields")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/auth/shop-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Registration failed")
        setIsLoading(false)
        return
      }

      const data = await response.json()
      localStorage.setItem("shop_session", JSON.stringify(data.shop))
      localStorage.setItem("shop_token", data.token || "")

      await new Promise(resolve => setTimeout(resolve, 300))
      router.push(`/shop/${data.shop.id}/dashboard`)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-lg border border-border shadow-lg p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Register Your Shop</h1>
        <p className="text-muted-foreground mb-6">Create a new shop account to get started</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Shop Name *</label>
            <Input
              type="text"
              name="shopName"
              placeholder="e.g., Shiv Tiles House"
              value={formData.shopName}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Owner Name *</label>
            <Input
              type="text"
              name="ownerName"
              placeholder="e.g., Bharat Singh"
              value={formData.ownerName}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
            <Input
              type="email"
              name="email"
              placeholder="owner@shop.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Phone *</label>
            <Input
              type="tel"
              name="phone"
              placeholder="9876543210"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">City</label>
            <Input
              type="text"
              name="city"
              placeholder="e.g., Mumbai"
              value={formData.city}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">State</label>
            <Input
              type="text"
              name="state"
              placeholder="e.g., Maharashtra"
              value={formData.state}
              onChange={handleChange}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Shop Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/shop-login" className="text-primary hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  )
}
