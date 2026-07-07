"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle } from "lucide-react"

export default function AgentLoginPage() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (!phoneNumber.trim()) {
        setError("Please enter your phone number")
        setIsLoading(false)
        return
      }

      let response: Response
      try {
        response = await fetch("/api/auth/agent-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number: phoneNumber }),
        })
      } catch (networkError) {
        setError("Network error - cannot connect to server")
        setIsLoading(false)
        return
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response:", text.slice(0, 200))
        setError(`Server returned HTML instead of JSON (status ${response.status}). Check console.`)
        setIsLoading(false)
        return
      }

      let data: any
      try {
        data = await response.json()
      } catch (parseError) {
        setError("Server returned invalid JSON")
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        setError(data.error || `Login failed (${response.status})`)
        setIsLoading(false)
        return
      }

      if (!data.agent || !data.agent.id) {
        setError("Invalid login response from server")
        setIsLoading(false)
        return
      }

      // Store session
      localStorage.setItem("agent_session", JSON.stringify(data.agent))
      localStorage.setItem("agent_token", data.token || "")
      
      router.push("/agent/dashboard")
    } catch (err) {
      console.error("Login exception:", err)
      setError("An unexpected error occurred. Check console.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Agent Portal</h1>
          <p className="text-muted-foreground mt-2">Login to view your commissions</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
            <Input
              type="tel"
              placeholder="9876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
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

        <div className="mt-6 text-center text-sm text-muted-foreground">Demo phone: 9876543210</div>
      </Card>
    </div>
  )
}