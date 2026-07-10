"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createShopClient } from "@/lib/supabase/shop-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Store, User, Mail, Lock, Eye, EyeOff, Phone, MapPin, Sparkles, CheckCircle2, ArrowRight, Shield } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createShopClient()
  const [activeTab, setActiveTab] = useState<"shop" | "agent">("shop")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Shop fields
  const [shopName, setShopName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")

  // Agent fields
  const [agentName, setAgentName] = useState("")
  const [agentPhone, setAgentPhone] = useState("")
  const [agentPassword, setAgentPassword] = useState("")

  const handleShopRegister = async () => {
    setLoading(true)
    setError("")
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: ownerName } },
      })
      if (authError || !authData.user) {
        setError(authError?.message || "Registration failed")
        setLoading(false)
        return
      }
      const { error: shopError } = await supabase.from("shops").insert({
        user_id: authData.user.id,
        name: shopName,
        owner_name: ownerName,
        email,
        phone,
        address,
      })
      if (shopError) {
        setError(shopError.message)
        setLoading(false)
        return
      }
      window.location.href = "/auth/shop-login"
    } catch (err: any) {
      setError(err.message || "Registration failed")
      setLoading(false)
    }
  }

  const handleAgentRegister = async () => {
    setLoading(true)
    setError("")
    try {
      const { error: agentError } = await supabase.from("agents").insert({
        name: agentName,
        phone: agentPhone,
        password: agentPassword || agentPhone,
      })
      if (agentError) {
        setError(agentError.message)
        setLoading(false)
        return
      }
      window.location.href = "/auth/agent-login"
    } catch (err: any) {
      setError(err.message || "Registration failed")
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (activeTab === "shop") handleShopRegister()
    else handleAgentRegister()
  }

  const benefits = [
    "Real-time commission tracking",
    "Automated payroll calculation",
    "Multi-shop agent management",
    "Secure data isolation",
    "Instant payout processing",
    "Attendance & overtime logging",
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
              Start Your
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Journey Today.
              </span>
            </h1>
            <p className="text-slate-300 text-base leading-relaxed mb-8 max-w-md">
              Join thousands of shop owners and agents who trust PayPro for their commission and payroll management.
            </p>

            <div className="space-y-3">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-indigo-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              &ldquo;PayPro transformed how we manage our 50+ agents. Commission tracking is now automatic and payroll takes minutes instead of days.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                RS
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Rahul Sharma</p>
                <p className="text-xs text-slate-400">Owner, Sharma Retail</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md py-8">
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
              <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Register as a {activeTab === "shop" ? "shop owner" : "sales agent"}
              </p>
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
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Shop Name</label>
                    <div className="relative">
                      <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Your shop name" value={shopName} onChange={(e) => setShopName(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Owner Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Your full name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type="tel" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Shop address" value={address} onChange={(e) => setAddress(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Your full name" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type="tel" placeholder="9876543210" value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} placeholder="Set a password (optional)" value={agentPassword} onChange={(e) => setAgentPassword(e.target.value)} className="pl-10 pr-10 h-11" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 btn-gradient text-base font-semibold">
                {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Shield size={18} className="mr-2" />}
                Create Account
              </Button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button variant="outline" className="w-full h-11 border-2 hover:bg-secondary/50" onClick={() => setError("Google signup coming soon")}>
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
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
