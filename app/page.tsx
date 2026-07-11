"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Store, UserPlus, ArrowRight, User } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="text-xl font-bold text-slate-900">PayPro</div>
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          <span className="hover:text-slate-900 cursor-pointer">Features</span>
          <span className="hover:text-slate-900 cursor-pointer">How it Works</span>
          <span className="hover:text-slate-900 cursor-pointer">Pricing</span>
          <span className="hover:text-slate-900 cursor-pointer">Resources</span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8">
          <span>✨</span> All-in-One Retail Management Platform
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 max-w-4xl leading-tight">
          Commission & Payroll<br />
          Made <span className="text-blue-600">Simple</span>,{" "}
          <span className="text-purple-600">Scalable</span> &{" "}
          <span className="text-emerald-600">Smart</span>
        </h1>

        <p className="text-lg text-slate-500 max-w-2xl mb-10">
          Automate commission tracking, manage agents across multiple shops, and process
          payroll seamlessly. Built for retail businesses that scale.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base rounded-xl"
            onClick={() => router.push("/auth/login?role=shop")}
          >
            <Store className="w-5 h-5 mr-2" />
            Shop Owner Login
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="px-8 py-6 text-base rounded-xl border-slate-300"
            onClick={() => router.push("/auth/register?role=shop")}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Create Shop
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-400 mb-8 w-full max-w-md">
          <div className="flex-1 h-px bg-slate-200" />
          <span>OR ACCESS AS</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className="px-8 py-6 text-base rounded-xl border-slate-300"
            onClick={() => router.push("/auth/login?role=agent")}
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Agent Login
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="px-8 py-6 text-base rounded-xl border-slate-300"
            onClick={() => router.push("/auth/register?role=agent")}
          >
            <User className="w-5 h-5 mr-2" />
            Register as Agent
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  )
}
