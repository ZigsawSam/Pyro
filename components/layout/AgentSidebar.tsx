"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Store,
  Wallet,
  TrendingUp,
  FileText,
  Bell,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react"
import { useState } from "react"

interface AgentSidebarProps {
  userName?: string
  agentId?: number
}

export function AgentSidebar({ userName, agentId }: AgentSidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [earningsOpen, setEarningsOpen] = useState(true)

  const workLinks = [
    { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agent/shops", label: "My Shops", icon: Store },
  ]

  const earningsLinks = [
    { href: "/agent/earnings", label: "Overview" },
    { href: "/agent/earnings/commissions", label: "Commission History" },
    { href: "/agent/earnings/payouts", label: "Payouts" },
    { href: "/agent/earnings/statements", label: "Statements" },
  ]

  const analyticsLinks = [
    { href: "/agent/performance", label: "Performance", icon: TrendingUp },
    { href: "/agent/reports", label: "Reports", icon: FileText },
  ]

  const accountLinks = [
    { href: "/agent/notifications", label: "Notifications", icon: Bell },
    { href: "/agent/settings", label: "Settings", icon: Settings },
  ]

  const isEarningsActive = pathname?.startsWith("/agent/earnings")

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
          <p className="text-sm text-sidebar-foreground/60 mt-1">Agent Portal</p>
        </div>

        <nav className="p-4 pb-24">
          {/* WORK section */}
          <div className="space-y-0.5">
            {workLinks.map(({ href, label, icon: Icon }) => {
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

            {/* Earnings with submenu */}
            <button
              onClick={() => setEarningsOpen(!earningsOpen)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 transition-all duration-200 w-full ${
                isEarningsActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Wallet size={18} className={isEarningsActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60"} />
              <span className="text-sm font-medium flex-1 text-left">Earnings</span>
              <ChevronDown size={14} className={`transition-transform ${earningsOpen ? "rotate-180" : ""}`} />
            </button>

            {earningsOpen && (
              <div className="ml-4 mb-2 space-y-0.5 border-l-2 border-sidebar-border/50 pl-3">
                {earningsLinks.map(({ href, label }) => {
                  const isActive = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "text-sidebar-primary font-medium"
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                      }`}
                    >
                      {label}
                    </Link>
                  )
                })}
              </div>
            )}

            {analyticsLinks.map(({ href, label, icon: Icon }) => {
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
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-sidebar-border/50" />

          {/* ACCOUNT section */}
          <div className="space-y-0.5">
            {accountLinks.map(({ href, label, icon: Icon }) => {
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
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-sidebar-border/50" />

          {/* Profile + Logout */}
          <div className="space-y-0.5">
            <Link
              href="/agent/profile"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 transition-all duration-200 ${
                pathname === "/agent/profile"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <User size={18} className={pathname === "/agent/profile" ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60"} />
              <span className="text-sm font-medium">Profile</span>
              {pathname === "/agent/profile" && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground" />}
            </Link>

            <button
              onClick={() => {
                setIsOpen(false)
                window.location.href = "/auth/logout"
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 transition-all duration-200 w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut size={18} className="text-sidebar-foreground/60" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>

        {/* User card at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border/50 bg-sidebar">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-sidebar-primary">
                {(userName || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{userName || "User"}</p>
              <p className="text-xs text-sidebar-foreground/50">Agent ID: AGT-{String(agentId || 0).padStart(4, "0")}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
