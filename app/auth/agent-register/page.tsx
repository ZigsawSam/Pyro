"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function AgentRegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    upiId: "",
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
      if (!formData.name || !formData.phoneNumber) {
        setError("Name and phone number are required")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/auth/agent-register", {
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
      localStorage.setItem("agent_session", JSON.stringify(data.agent))
      localStorage.setItem("agent_token", data.token || "")

      await new Promise(resolve => setTimeout(resolve, 300))
      router.push("/agent/dashboard")
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-lg border border-border shadow-lg p-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Register as Agent</h1>
        <p className="text-muted-foreground mb-6">Create your agent account to start earning commissions</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
            <Input
              type="text"
              name="name"
              placeholder="e.g., Ramesh Kumar"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Phone Number *</label>
            <Input
              type="tel"
              name="phoneNumber"
              placeholder="9876543210"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Account Name</label>
            <Input
              type="text"
              name="accountName"
              placeholder="Bank account holder name"
              value={formData.accountName}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Account Number</label>
            <Input
              type="text"
              name="accountNumber"
              placeholder="12345678901234"
              value={formData.accountNumber}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Bank Name</label>
            <Input
              type="text"
              name="bankName"
              placeholder="e.g., HDFC Bank"
              value={formData.bankName}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">IFSC Code</label>
            <Input
              type="text"
              name="ifscCode"
              placeholder="HDFC0001234"
              value={formData.ifscCode}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">UPI ID</label>
            <Input
              type="text"
              name="upiId"
              placeholder="name@upi"
              value={formData.upiId}
              onChange={handleChange}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Agent Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/auth/agent-login" className="text-primary hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  )
}
