"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createShopClient } from "@/lib/supabase/shop-client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Loader2,
  Store,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Users,
  Building2,
  Hash,
  Landmark,
  Briefcase,
  FileText,
  Info,
  ChevronRight,
  Check,
} from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createShopClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Step 1: Shop Details
  const [shopName, setShopName] = useState("")
  const [email, setEmail] = useState("")
  const [shopAddress, setShopAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")
  const [phone, setPhone] = useState("")
  const [altPhone, setAltPhone] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [gstin, setGstin] = useState("")

  // Step 2: Owner Details
  const [ownerName, setOwnerName] = useState("")

  // Step 3: Security
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleNext = () => {
    setError("")
    if (step === 1) {
      if (!shopName || !email || !shopAddress || !city || !state || !pincode || !phone) {
        setError("Please fill in all required fields.")
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!ownerName) {
        setError("Please enter the owner name.")
        return
      }
      setStep(3)
    }
  }

  const handleBack = () => {
    setError("")
    if (step > 1) setStep((prev) => (prev - 1) as 1 | 2 | 3)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        setLoading(false)
        return
      }

      console.log("[REGISTER] Starting registration for:", email)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: ownerName } },
      })

      console.log("[REGISTER] Auth result:", { authData, authError })

      if (authError || !authData.user) {
        setError(authError?.message || "Registration failed")
        setLoading(false)
        return
      }

      // MATCH YOUR ACTUAL SCHEMA: shop_name (not name), bigint id
      const payload: Record<string, any> = {
        user_id: authData.user.id,
        shop_name: shopName,
        owner_name: ownerName,
        email,
        phone,
        address: shopAddress,
      }
      if (altPhone) payload.alt_phone = altPhone
      if (city) payload.city = city
      if (state) payload.state = state
      if (pincode) payload.pincode = pincode
      if (businessType) payload.business_type = businessType
      if (gstin) payload.gstin = gstin

      console.log("[REGISTER] Inserting shop with payload:", payload)

      const { data: shopInsertData, error: shopError } = await supabase.from("shops").insert(payload).select()

      console.log("[REGISTER] Shop insert result:", { shopInsertData, shopError })

      if (shopError) {
        setError(shopError.message)
        setLoading(false)
        return
      }

      // FIXED: Redirect directly to /auth/login instead of /auth/shop-login
      console.log("[REGISTER] Success! Redirecting to /auth/login")
      window.location.href = "/auth/login"
    } catch (err: any) {
      console.error("[REGISTER] Error:", err)
      setError(err.message || "Registration failed")
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Shield,
      title: "Secure & Reliable",
      desc: "Your data is protected with enterprise-grade security.",
    },
    {
      icon: Zap,
      title: "Easy to Use",
      desc: "Simple setup and intuitive dashboards for everyone.",
    },
    {
      icon: Users,
      title: "Built for Growth",
      desc: "Scalable platform to support your business as you grow.",
    },
  ]

  const stats = [
    { value: "500+", label: "Shops Onboarded" },
    { value: "10K+", label: "Active Agents" },
    { value: "$2.4M+", label: "Commissions Processed" },
    { value: "99.9%", label: "Uptime & Reliability" },
  ]

  const steps = [
    { num: 1, label: "Shop Details" },
    { num: 2, label: "Owner Details" },
    { num: 3, label: "Security" },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Dark Navy */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-[#0B1120] relative overflow-hidden flex-col">
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">PayPro</h2>
              <p className="text-xs text-slate-400">Commission & Payroll System</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="mt-12">
            <h1 className="text-4xl xl:text-[2.75rem] font-bold text-white leading-tight">
              Grow Your Business
              <br />
              <span className="text-[#818CF8]">Smarter</span> with PayPro
            </h1>
            <p className="text-slate-400 text-base leading-relaxed mt-4 max-w-md">
              Create your shop account and start managing agents, tracking commissions, and automating payroll — all in one powerful platform.
            </p>
          </div>

          {/* Dashboard Screenshot Placeholder */}
          <div className="mt-8 flex-1 flex items-center justify-center">
            <div className="relative w-full max-w-[420px]">
              {/* Browser chrome */}
              <div className="bg-[#1E293B] rounded-t-xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-[#0F172A] rounded-md px-3 py-1 text-xs text-slate-500 text-center">
                    paypro.app/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard mockup */}
              <div className="bg-white rounded-b-xl p-5 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-800">Dashboard</span>
                  <div className="w-8 h-8 rounded-full bg-[#4F46E5] flex items-center justify-center">
                    <User size={14} className="text-white" />
                  </div>
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Total Sales", value: "$24,780", change: "+18.6%", up: true },
                    { label: "Total Commission", value: "$7,985", change: "+12.4%", up: true },
                    { label: "Active Agents", value: "128", change: "+8.3%", up: true },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500">{s.label}</p>
                      <p className="text-sm font-bold text-slate-800">{s.value}</p>
                      <p className={`text-[10px] ${s.up ? "text-emerald-500" : "text-red-500"}`}>
                        {s.change}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Chart area */}
                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <p className="text-[10px] text-slate-500 mb-2">Sales Overview</p>
                  <svg viewBox="0 0 300 60" className="w-full h-12">
                    <path
                      d="M0,50 Q30,45 60,35 T120,30 T180,20 T240,25 T300,10"
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,50 Q30,45 60,35 T120,30 T180,20 T240,25 T300,10 L300,60 L0,60 Z"
                      fill="url(#chartGrad)"
                      opacity="0.1"
                    />
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F46E5" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                {/* Pending payroll card */}
                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Pending Payroll</p>
                    <p className="text-sm font-bold text-slate-800">$18,650</p>
                  </div>
                  <span className="text-[10px] text-red-500">↓ 5.7%</span>
                </div>
              </div>
              {/* Floating card */}
              <div className="absolute -right-4 top-1/2 bg-white rounded-xl p-3 shadow-xl border border-slate-100">
                <p className="text-[10px] text-slate-500">This Month</p>
                <p className="text-sm font-bold text-slate-800">$24,780</p>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[#1E293B]/60 backdrop-blur-sm border border-slate-700/30 rounded-xl p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/20 flex items-center justify-center mb-2">
                  <f.icon size={16} className="text-[#818CF8]" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="mt-8 bg-[#1E293B]/40 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-5">
            <p className="text-xs font-medium text-slate-300 mb-4">
              Trusted by Small Businesses
            </p>
            <div className="grid grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/15 flex items-center justify-center mx-auto mb-2">
                    {s.label.includes("Shops") && <Store size={18} className="text-[#818CF8]" />}
                    {s.label.includes("Agents") && <Users size={18} className="text-[#34D399]" />}
                    {s.label.includes("Commissions") && (
                      <span className="text-[#FBBF24] text-lg font-bold">$</span>
                    )}
                    {s.label.includes("Uptime") && <Shield size={18} className="text-[#60A5FA]" />}
                  </div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side — Light Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-[#F8FAFC] overflow-y-auto">
        <div className="w-full max-w-xl py-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">PayPro</span>
          </div>

          <Card className="p-6 sm:p-8 border border-slate-200 shadow-lg bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                <Store size={20} className="text-[#4F46E5]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Register Your Shop</h2>
                <p className="text-sm text-slate-500">
                  Fill in the details below to create your shop account
                </p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center mt-6 mb-6">
              {steps.map((s, i) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        step >= s.num
                          ? "bg-[#4F46E5] text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {step > s.num ? <Check size={14} /> : s.num}
                    </div>
                    <span
                      className={`text-sm font-medium hidden sm:block ${
                        step >= s.num ? "text-[#4F46E5]" : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-3 ${
                        step > s.num ? "bg-[#4F46E5]" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Form Content */}
            <div className="space-y-4">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Shop Name
                      </label>
                      <div className="relative">
                        <Store
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          placeholder="Enter shop name"
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="email"
                          placeholder="Enter email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Shop Address
                    </label>
                    <div className="relative">
                      <MapPin
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        placeholder="Enter complete shop address"
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        City
                      </label>
                      <div className="relative">
                        <Building2
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          placeholder="Enter city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        State
                      </label>
                      <div className="relative">
                        <Landmark
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <select
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full h-11 pl-10 pr-8 rounded-md border border-slate-200 bg-white text-sm text-slate-900 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="">Select state</option>
                          <option value="Bihar">Bihar</option>
                          <option value="Uttar Pradesh">Uttar Pradesh</option>
                          <option value="West Bengal">West Bengal</option>
                          <option value="Jharkhand">Jharkhand</option>
                          <option value="Delhi">Delhi</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronRight
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Pincode
                      </label>
                      <div className="relative">
                        <Hash
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          placeholder="Enter pincode"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Contact Section */}
                  <h3 className="text-sm font-semibold text-[#4F46E5] pt-2">
                    Business Contact
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="tel"
                          placeholder="Enter phone number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Alternate Phone{" "}
                        <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Phone
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="tel"
                          placeholder="Enter alternate number"
                          value={altPhone}
                          onChange={(e) => setAltPhone(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Information Section */}
                  <h3 className="text-sm font-semibold text-[#4F46E5] pt-2">
                    Business Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Business Type
                      </label>
                      <div className="relative">
                        <Briefcase
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <select
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value)}
                          className="w-full h-11 pl-10 pr-8 rounded-md border border-slate-200 bg-white text-sm text-slate-900 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="">Select business type</option>
                          <option value="Retail">Retail Shop</option>
                          <option value="Wholesale">Wholesale</option>
                          <option value="Distributor">Distributor</option>
                          <option value="Manufacturer">Manufacturer</option>
                          <option value="Service">Service Provider</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronRight
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Shop GSTIN{" "}
                        <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <FileText
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          placeholder="Enter GSTIN number"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg p-3 flex items-start gap-2">
                    <Info size={16} className="text-[#4F46E5] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-[#4F46E5]">
                      You can always update these details later from settings.
                    </p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Owner Name
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        placeholder="Enter owner full name"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="bg-[#F1F5F9] rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      Review Shop Details
                    </h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Shop Name</span>
                        <span className="text-slate-800 font-medium">{shopName || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email</span>
                        <span className="text-slate-800 font-medium">{email || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Address</span>
                        <span className="text-slate-800 font-medium text-right max-w-[200px] truncate">
                          {shopAddress || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Location</span>
                        <span className="text-slate-800 font-medium">
                          {city && state ? `${city}, ${state}` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phone</span>
                        <span className="text-slate-800 font-medium">{phone || "—"}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#F1F5F9] rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      Account Summary
                    </h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Shop</span>
                        <span className="text-slate-800 font-medium">{shopName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Owner</span>
                        <span className="text-slate-800 font-medium">{ownerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email</span>
                        <span className="text-slate-800 font-medium">{email}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="h-11 px-6 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    onClick={handleNext}
                    className="flex-1 h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold"
                  >
                    Next: {steps[step].label}
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                      <Shield size={18} className="mr-2" />
                    )}
                    Create Account
                  </Button>
                )}
              </div>

              {/* Login Link */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-[#4F46E5] hover:underline font-medium"
                  >
                    Login
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
