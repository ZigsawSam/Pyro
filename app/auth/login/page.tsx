"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createShopClient } from "@/lib/supabase/shop-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Mail, Lock, Eye, EyeOff, Store, User, BarChart3, Users, DollarSign, Sparkles, Phone } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createShopClient()
  const [activeTab, setActiveTab] = useState<"shop" | "agent">("shop")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const handleShopLogin = async () => {
    setLoading(true)
    setError("")
    try {
      console.log("[LOGIN] Attempting login for:", email)

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      console.log("[LOGIN] Auth result:", { authData, authError })

      if (authError || !authData?.user) {
        setError(authError?.message || "Invalid login credentials")
        setLoading(false)
        return
      }

      console.log("[LOGIN] Auth user ID:", authData.user.id)

      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("id, shop_name, user_id")
        .eq("user_id", authData.user.id)
        .single()

      console.log("[LOGIN] Shop lookup result:", { shop, shopError })

      if (shopError || !shop) {
        console.log("[LOGIN] No shop found — checking all shops for this user_id...")

        // Debug: list all shops to see what's there
        const { data: allShops } = await supabase.from("shops").select("id, shop_name, user_id, email")
        console.log("[LOGIN] All shops in DB:", allShops)

        setError("No shop found for this account. Please register.")
        setLoading(false)
        return
      }

      console.log("[LOGIN] Success! Redirecting to dashboard:", `/shop/${shop.id}/dashboard`)
      window.location.href = `/shop/${shop.id}/dashboard`
    } catch (err: any) {
      console.error("[LOGIN] Error:", err)
      setError(err.message || "Login failed")
      setLoading(false)
    }
  }

  const handleAgentLogin = async () => {
    setLoading(true)
    setError("")
    try {
      const agentEmail = `${phone}@agent.local`
      const agentPassword = password || phone

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: agentEmail,
        password: agentPassword,
      })

      if (authError || !authData.user) {
        setError(authError?.message || "Invalid credentials")
        setLoading(false)
        return
      }

      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("id, name, phone_number, user_id")
        .eq("user_id", authData.user.id)
        .single()

      if (agentError || !agent) {
        setError("Agent profile not found. Please contact your shop owner.")
        setLoading(false)
        return
      }

      window.location.href = "/agent/dashboard"
    } catch (err: any) {
      console.error("[LOGIN] Agent error:", err)
      setError(err.message || "Login failed")
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (activeTab === "shop") handleShopLogin()
    else handleAgentLogin()
  }

  const features = [
    { icon: BarChart3, title: "Real-time Analytics", description: "Track performance and sales in real-time." },
    { icon: Users, title: "Agent Management", description: "Manage agents across multiple shops seamlessly." },
    { icon: DollarSign, title: "Payroll Automation", description: "Generate payroll and process payments with ease." },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Dark Gradient */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">PayPro</h2>
              <p className="text-xs text-slate-400">Commission & Payroll System</p>
            </div>
          </div>
          <div className="my-auto">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Smarter Tracking.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Stronger Business.</span>
            </h1>
            <p className="text-slate-300 text-base leading-relaxed mb-10 max-w-md">
              Track sales, manage agents, automate commissions and process payroll — all in one powerful platform.
            </p>
            <div className="space-y-5">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <f.icon size={18} className="text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
            <p className="text-xs text-slate-400 mb-3">Overview</p>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Total Sales</p>
                <p className="text-sm font-bold text-white">$24,780</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">↑ 18.6%</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Commission</p>
                <p className="text-sm font-bold text-white">$7,985</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">↑ 12.4%</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Agents</p>
                <p className="text-sm font-bold text-white">128</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">↑ 8.3%</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 mb-1">Payroll</p>
                <p className="text-sm font-bold text-white">$18,650</p>
                <p className="text-[10px] text-rose-400 mt-0.5">↓ 5.7%</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400">Sales Overview</p>
                <p className="text-[10px] text-slate-500">This Week</p>
              </div>
              <svg viewBox="0 0 300 60" className="w-full h-12">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.2 252.8)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="oklch(0.65 0.2 252.8)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,50 Q30,45 60,35 T120,30 T180,25 T240,15 T300,10" fill="none" stroke="oklch(0.65 0.2 252.8)" strokeWidth="2" />
                <path d="M0,50 Q30,45 60,35 T120,30 T180,25 T240,15 T300,10 L300,60 L0,60 Z" fill="url(#chartGrad)" />
                <circle cx="300" cy="10" r="4" fill="oklch(0.65 0.2 252.8)" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles size={16} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">PayPro</span>
          </div>
          <Card className="p-6 sm:p-8 border border-border shadow-lg bg-card">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welcome back!</h2>
              <p className="text-sm text-muted-foreground mt-1">Login to your {activeTab === "shop" ? "shop" : "agent"} account to continue</p>
            </div>

            {/* Tabs */}
            <div className="flex mb-6 border-b border-border">
              <button
                onClick={() => { setActiveTab("shop"); setError("") }}
                className={`flex-1 flex items-center justify-center gap-2 pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === "shop" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Store size={16} />
                Shop Owner
                {activeTab === "shop" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
              <button
                onClick={() => { setActiveTab("agent"); setError("") }}
                className={`flex-1 flex items-center justify-center gap-2 pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === "agent" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User size={16} />
                Agent
                {activeTab === "agent" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            </div>

            <div className="space-y-4">
              {activeTab === "shop" ? (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="tel" placeholder="Enter your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-11" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={activeTab === "agent" ? "Enter password (or leave blank to use phone)" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <button className="text-sm text-primary hover:underline">Forgot password?</button>
              </div>

              <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 btn-gradient text-base font-semibold">
                {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Lock size={18} className="mr-2" />}
                Login to Dashboard
              </Button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button variant="outline" className="w-full h-11 border-2 hover:bg-secondary/50" onClick={() => setError("Google login coming soon")}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{" "}
              {activeTab === "shop" ? (
                <Link href="/auth/register" className="text-primary hover:underline font-medium">Contact your administrator</Link>
              ) : (
                <Link href="/auth/register" className="text-primary hover:underline font-medium">Register here</Link>
              )}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
