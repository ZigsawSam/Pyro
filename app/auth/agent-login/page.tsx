"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle } from "lucide-react"

export default function AgentLoginPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
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

      // Agents use phone@agent.local as email
      const agentEmail = `${phoneNumber}@agent.local`

      // Race against timeout to fix Supabase hanging promise bug on Vercel
      const loginPromise = supabase.auth.signInWithPassword({
        email: agentEmail,
        password: password || phoneNumber,
      })

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LOGIN_TIMEOUT")), 10000)
      )

      let result: any
      try {
        result = await Promise.race([loginPromise, timeoutPromise])
      } catch (timeoutErr: any) {
        if (timeoutErr.message === "LOGIN_TIMEOUT") {
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

      const { data, error: authError } = result

      if (authError || !data.user) {
        setError(authError?.message || "Invalid phone number or password")
        setIsLoading(false)
        return
      }

      // Verify agent profile exists
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", data.user.id)
        .single()

      if (agentError || !agent) {
        setError("Agent profile not found. Please register first.")
        setIsLoading(false)
        return
      }

      window.location.href = "/agent/dashboard"
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Password</label>
            <Input
              type="password"
              placeholder="Enter password (or leave blank to use phone)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          New agent? <a href="/auth/agent-register" className="text-primary hover:underline">Register here</a>
        </div>
      </Card>
    </div>
  )
}