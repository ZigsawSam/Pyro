"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Store,
  BarChart3,
  Wallet,
  TrendingUp,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  shopId?: number
  isAgent?: boolean
  userName?: string
}

export function Sidebar({ shopId, isAgent = false, userName }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const agentLinks = [
    { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agent/shops", label: "My Shops", icon: Store },
    { href: "/agent/commissions", label: "Commissions", icon: BarChart3 },
    { href: "/agent/payouts", label: "Payouts", icon: Wallet },
    { href: "/agent/performance", label: "Performance", icon: TrendingUp },
    { href: "/agent/reports", label: "Reports", icon: FileText },
    { href: "/agent/notifications", label: "Notifications", icon: Bell },
  ]

  const shopLinks = shopId
    ? [
        { href: `/shop/${shopId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { href: `/shop/${shopId}/agents`, label: "Agents", icon: Store },
        { href: `/shop/${shopId}/sales`, label: "Sales", icon: BarChart3 },
        { href: `/shop/${shopId}/staff`, label: "Staff & Payroll", icon: Wallet },
        { href: `/shop/${shopId}/payouts`, label: "Payouts", icon: Wallet },
        { href: `/shop/${shopId}/reports`, label: "Reports", icon: FileText },
      ]
    : []

  const links = isAgent ? agentLinks : shopLinks

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-secondary transition-colors"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Dark navy like reference */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-[240px] bg-[#0f172a] text-white transform transition-transform duration-300 ease-out z-40 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-lg font-bold text-white">P</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">PayPro</h1>
            <p className="text-xs text-slate-400">Agent Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 py-2">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname?.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-0.5 transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 w-full hover:bg-slate-800 rounded-lg p-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {userName
                  ? userName.split(" ").map((n) => n[0]).join("").toUpperCase()
                  : "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{userName || "User"}</p>
              <p className="text-xs text-slate-400">{isAgent ? "Agent" : "Shop Owner"}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="mt-2 bg-slate-800 rounded-lg overflow-hidden">
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
