"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, BarChart3, Briefcase, LogOut, Menu, X } from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  shopId?: number
  isAgent?: boolean
  userName?: string
}

export function Sidebar({ shopId, isAgent = false, userName }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const shopLinks = shopId
    ? [
        {
          href: `/shop/${shopId}/dashboard`,
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          href: `/shop/${shopId}/agents`,
          label: "Agents",
          icon: Users,
        },
        {
          href: `/shop/${shopId}/sales`,
          label: "Sales",
          icon: Briefcase,
        },
        {
          href: `/shop/${shopId}/staff`,
          label: "Staff & Payroll",
          icon: Users,
        },
        {
          href: `/shop/${shopId}/attendance`,
          label: "Attendance",
          icon: BarChart3,
        },
        {
          href: `/shop/${shopId}/payouts`,
          label: "Payouts",
          icon: BarChart3,
        },
        {
          href: `/shop/${shopId}/reports`,
          label: "Reports",
          icon: BarChart3,
        },
      ]
    : []

  const agentLinks = [
    {
      href: "/agent/dashboard",
      label: "My Shops",
      icon: Briefcase,
    },
    {
      href: "/agent/commissions",
      label: "Commissions",
      icon: BarChart3,
    },
    {
      href: "/agent/payouts",
      label: "Payouts",
      icon: BarChart3,
    },
  ]

  const links = isAgent ? agentLinks : shopLinks

  return (
    <>
      {/* Mobile menu button */}
      <button onClick={() => setIsOpen(!isOpen)} className="fixed top-4 right-4 z-40 lg:hidden">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 z-40 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-primary">PayPro</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAgent ? "Agent Portal" : "Shop Dashboard"}</p>
        </div>

        <nav className="p-4">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <div className="text-sm mb-3">
            <p className="text-muted-foreground">Logged in as</p>
            <p className="font-semibold truncate">{userName || "User"}</p>
          </div>
          <Link
            href="/logout"
            className="flex items-center gap-2 text-destructive hover:bg-sidebar-accent px-3 py-2 rounded transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      {/* Main content margin */}
      <div className="lg:ml-64" />
    </>
  )
}
