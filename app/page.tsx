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
} from "lucide-react"

const stats = [
  { value: "10K+", label: "Transactions Processed", suffix: "" },
  { value: "500+", label: "Active Shops", suffix: "" },
  { value: "2K+", label: "Agents Onboarded", suffix: "" },
  { value: "99.9%", label: "Uptime Guaranteed", suffix: "" },
]

const features = [
  {
    icon: BarChart3,
    title: "Commission Tracking",
    description: "Real-time tracking of agent sales with automatic commission calculation. No more manual spreadsheets.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Payroll Management",
    description: "Manage staff attendance, calculate salaries automatically, and process payouts in one click.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Reports",
    description: "Comprehensive reports on commissions, payroll, and staff productivity with date-range filtering.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Secure & Isolated",
    description: "Multi-tenant architecture ensures each shop's data is completely isolated with secure authentication.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Process payments to agents and staff instantly. Track advances, pending amounts, and history.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Clock,
    title: "Attendance Logging",
    description: "Log daily attendance for all staff members. Auto-calculate salary based on present, half-day, and overtime.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
]

const steps = [
  {
    icon: Store,
    title: "Create Your Shop",
    description: "Sign up as a shop owner and set up your business profile in under 2 minutes.",
  },
  {
    icon: UserCheck,
    title: "Onboard Agents & Staff",
    description: "Add agents to track commissions and staff to manage payroll and attendance.",
  },
  {
    icon: Receipt,
    title: "Track & Pay",
    description: "Record sales, log attendance, generate reports, and process payouts seamlessly.",
  },
]

function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [display, setDisplay] = useState("0")
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true
            const num = parseFloat(value.replace(/[^0-9.]/g, ""))
            const prefix = value.replace(/[0-9.]/g, "")
            const duration = 1500
            const startTime = Date.now()
            const animate = () => {
              const elapsed = Date.now() - startTime
              const progress = Math.min(elapsed / duration, 1)
              const easeOut = 1 - Math.pow(1 - progress, 3)
              const current = num * easeOut
              if (value.includes(".")) {
                setDisplay(prefix + current.toFixed(1) + suffix)
              } else {
                setDisplay(prefix + Math.floor(current).toLocaleString() + suffix)
              }
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
  }, [value, suffix])

  return (
    <div ref={ref} className="text-3xl sm:text-4xl font-bold text-foreground">
      {display || value}
    </div>
  )
}

function FloatingParticle({ delay, size, left, duration }: { delay: number; size: number; left: string; duration: number }) {
  return (
    <div
      className="absolute rounded-full bg-primary/20 animate-float-slow pointer-events-none"
      style={{
        width: size,
        height: size,
        left,
        top: `${Math.random() * 80 + 10}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
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
      {/* Animated background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 animate-gradient opacity-30 dark:opacity-20"
          style={{
            background: "linear-gradient(-45deg, oklch(0.85 0.1 252.8), oklch(0.9 0.08 200), oklch(0.88 0.1 280), oklch(0.92 0.06 160))",
            backgroundSize: "400% 400%",
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-glow" style={{ animationDelay: "1.5s" }} />
        {/* Floating particles */}
        <FloatingParticle delay={0} size={8} left="10%" duration={7} />
        <FloatingParticle delay={2} size={6} left="25%" duration={9} />
        <FloatingParticle delay={1} size={10} left="70%" duration={8} />
        <FloatingParticle delay={3} size={5} left="85%" duration={10} />
        <FloatingParticle delay={1.5} size={7} left="50%" duration={6} />
      </div>

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-background/80 backdrop-blur-lg border-b border-border shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles size={16} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">PayPro</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-40 pb-16 sm:pb-24">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-8 animate-fade-in">
            <Sparkles size={14} className="text-primary" />
            <span className="text-sm font-medium text-primary">Retail Management Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Commission &{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Payroll System
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Automate commission tracking, manage agents across multiple shops, and process payroll seamlessly.
            Built for retail businesses that scale.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link href="/auth/shop-login">
              <Button size="lg" className="btn-gradient px-8 h-12 text-base font-semibold">
                Shop Owner Login
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Link href="/auth/shop-register">
              <Button size="lg" variant="outline" className="px-8 h-12 text-base font-semibold border-2 hover:bg-secondary/50">
                Create Shop
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <Link href="/auth/agent-login">
              <Button size="lg" variant="secondary" className="px-8 h-11 text-base">
                Agent Login
              </Button>
            </Link>
            <Link href="/auth/agent-register">
              <Button size="lg" variant="ghost" className="px-8 h-11 text-base hover:bg-secondary/50">
                Register as Agent
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative py-12 border-y border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={stat.label} className="text-center animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <AnimatedCounter value={stat.value} />
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete platform to manage commissions, payroll, and staff — all in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
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
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 sm:py-28 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get started in three simple steps. No complex setup required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

            {steps.map((step, i) => (
              <div key={step.title} className="text-center relative animate-card-enter" style={{ animationDelay: `${0.2 * i}s` }}>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-6 relative z-10 bg-card">
                  <step.icon size={28} className="text-primary" />
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-4">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center bg-card border border-border rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Streamline Your Business?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join hundreds of shop owners who have simplified their commission and payroll management.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/shop-register">
                  <Button size="lg" className="btn-gradient px-8 h-12 text-base font-semibold">
                    Get Started Free
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                <Link href="/auth/shop-login">
                  <Button size="lg" variant="outline" className="px-8 h-12 text-base border-2">
                    Already Have an Account?
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Free to start
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500" /> No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Sparkles size={12} className="text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm text-foreground">PayPro</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-tenant platform with complete data isolation. Secure authentication.
            </p>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} PayPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
