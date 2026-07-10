"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  BarChart3,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  CheckCircle2,
  Store,
  UserCheck,
  Receipt,
  Sparkles,
  Lock,
  ChevronDown,
  ShieldCheck,
  FileCheck,
  Plus,
  LogIn,
  UserPlus,
} from "lucide-react"

const stats = [
  { value: "500+", label: "Shops Onboarded", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "10K+", label: "Active Agents", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { value: "₹2.4M+", label: "Commissions Processed", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
  { value: "99.9%", label: "Uptime & Reliability", icon: ShieldCheck, color: "text-rose-500", bg: "bg-rose-500/10" },
]

const features = [
  {
    icon: BarChart3,
    title: "Commission Tracking",
    description: "Real-time tracking of agent sales and automatic commission calculation.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    linkColor: "text-blue-500 hover:text-blue-600",
  },
  {
    icon: Users,
    title: "Payroll Management",
    description: "Manage staff attendance, salary, withdrawals, and generate monthly payroll.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    linkColor: "text-emerald-500 hover:text-emerald-600",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Reports",
    description: "Comprehensive reports on commissions, payroll, and staff productivity.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    linkColor: "text-amber-500 hover:text-amber-600",
  },
]

function AnimatedCounter({ value }: { value: string }) {
  const [display, setDisplay] = useState(value)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true
            // Extract numeric part and suffix
            const match = value.match(/^([₹$]?)([0-9.]+)([K+M+%+]?)$/)
            if (!match) {
              setDisplay(value)
              return
            }
            const prefix = match[1] || ""
            const num = parseFloat(match[2])
            const suffix = match[3] || ""
            const duration = 1500
            const startTime = Date.now()
            const animate = () => {
              const elapsed = Date.now() - startTime
              const progress = Math.min(elapsed / duration, 1)
              const easeOut = 1 - Math.pow(1 - progress, 3)
              const current = num * easeOut
              let formatted: string
              if (value.includes(".")) {
                formatted = current.toFixed(1)
              } else {
                formatted = Math.floor(current).toLocaleString()
              }
              setDisplay(prefix + formatted + suffix)
              if (progress < 1) requestAnimationFrame(animate)
            }
            animate()
          }
        })
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="text-2xl sm:text-3xl font-bold text-foreground">
      {display}
    </div>
  )
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-background/90 backdrop-blur-lg border-b border-border shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles size={16} className="text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-base text-foreground block">PayPro</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">Commission & Payroll System</span>
            </div>
          </div>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</button>
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</button>
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Resources <ChevronDown size={14} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/shop-login" className="hidden sm:block">
              <Button size="sm" className="btn-gradient px-4 h-9 text-sm">
                <Lock size={14} className="mr-1.5" />
                Shop Owner Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-40 pb-8">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-8 animate-fade-in">
            <Sparkles size={14} className="text-primary" />
            <span className="text-sm font-medium text-primary">All-in-One Retail Management Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Commission & Payroll
            <br />
            Made <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">Simple, Scalable & Smart</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Automate commission tracking, manage agents across multiple shops, and process payroll seamlessly.
            Built for retail businesses that scale.
          </p>

          {/* Shop Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link href="/auth/shop-login">
              <Button size="lg" className="btn-gradient px-6 h-12 text-base font-semibold rounded-xl">
                <Store size={18} className="mr-2" />
                Shop Owner Login
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
            <Link href="/auth/shop-register">
              <Button size="lg" variant="outline" className="px-6 h-12 text-base font-semibold rounded-xl border-2 hover:bg-secondary/50">
                <Plus size={18} className="mr-2" />
                Create Shop
                <ArrowRight size={16} className="ml-2 text-muted-foreground" />
              </Button>
            </Link>
          </div>

          {/* OR ACCESS AS Divider */}
          <div className="flex items-center gap-4 justify-center mb-6 max-w-md mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">OR ACCESS AS</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Agent Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <Link href="/auth/agent-login">
              <Button size="lg" variant="outline" className="px-6 h-12 text-base rounded-xl border-2 hover:bg-secondary/50">
                <LogIn size={18} className="mr-2 text-primary" />
                Agent Login
                <ArrowRight size={16} className="ml-2 text-muted-foreground" />
              </Button>
            </Link>
            <Link href="/auth/agent-register">
              <Button size="lg" variant="outline" className="px-6 h-12 text-base rounded-xl border-2 hover:bg-secondary/50">
                <UserPlus size={18} className="mr-2 text-primary" />
                Register as Agent
                <ArrowRight size={16} className="ml-2 text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="feature-card card-hover bg-card border border-border rounded-2xl p-6 sm:p-8 animate-card-enter"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                  <feature.icon size={24} className={feature.color} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.description}</p>
                <button className={`text-sm font-medium flex items-center gap-1 transition-colors ${feature.linkColor}`}>
                  Learn more <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative py-12 border-y border-border/50 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon size={22} className={stat.color} />
                </div>
                <div>
                  <AnimatedCounter value={stat.value} />
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Trust Bar */}
      <footer className="relative border-t border-border py-6">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Secure <span className="text-muted-foreground mx-1">•</span>{" "}
                Reliable <span className="text-muted-foreground mx-1">•</span>{" "}
                Scalable
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Multi-tenant platform with complete data isolation. Each shop's data is completely isolated with secure authentication.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock size={12} />
              SSL Secured
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
