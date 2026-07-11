"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  Wallet,
  FileText,
  Menu,
  X,
  ChevronDown,
} from "lucide-react"
import { useState } from "react"

interface ShopSidebarProps {
  shopId?: number
  shopName?: string
  userName?: string
}

export function ShopSidebar({ shopId, shopName, userName }: ShopSidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const links = shopId
    ? [
        { href: `/shop/${shopId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { href: `/shop/${shopId}/agents`, label: "Agents", icon: Users },
        { href: `/shop/${shopId}/sales`, label: "Sales", icon: Briefcase },
        { href: `/shop/${shopId}/staff`, label: "Staff & Payroll", icon: Users },
        { href: `/shop/${shopId}/attendance`, label: "Attendance", icon: Clock },
        { href: `/shop/${shopId}/payouts`, label: "Payouts", icon: Wallet },
        { href: `/shop/${shopId}/reports`, label: "Reports", icon: FileText },
      ]
    : []

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-secondary transition-colors"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[50] lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - higher z-index than header */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-out z-[60] overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-primary tracking-tight">PayPro</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Shop Dashboard</p>
        </div>

        <nav className="p-4 pb-24">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname?.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon size={18} className={isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60"} />
                <span className="text-sm font-medium">{label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground" />}
              </Link>
            )
          })}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border/50 bg-sidebar">
          <div className="flex items-center gap-3 w-full rounded-xl p-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-sidebar-primary">
                {(userName || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium truncate">{userName || "User"}</p>
              <p className="text-xs text-sidebar-foreground/50">Shop Owner</p>
            </div>
          </div>

          {/* Settings & Logout moved to header dropdown */}
        </div>
      </aside>
    </>
  )
}
