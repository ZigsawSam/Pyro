"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingCart,
  Receipt,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Settings,
  Package,
  CreditCard,
} from "lucide-react"

interface ShopSidebarProps {
  shopName?: string
  shopId?: number
}

const navSections = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { label: "My Shop", icon: Store, href: "/shop" },
      { label: "Products", icon: Package, href: "/products" },
      { label: "Sales", icon: ShoppingCart, href: "/sales" },
      { label: "Agents", icon: Users, href: "/agents" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Transactions", icon: CreditCard, href: "/transactions" },
      { label: "Invoices", icon: Receipt, href: "/invoices" },
      {
        label: "Reports",
        icon: FileText,
        href: "/reports",
        children: [
          { label: "Sales Report", href: "/reports/sales" },
          { label: "Commission Report", href: "/reports/commission" },
          { label: "Inventory Report", href: "/reports/inventory" },
        ],
      },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { label: "Analytics", icon: BarChart3, href: "/analytics" },
    ],
  },
]

export function ShopSidebar({ shopName = "My Shop", shopId }: ShopSidebarProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<string | null>("Reports")
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const initials = shopName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = () => {
    window.location.href = "/auth/logout"
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#0f172a] text-white flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-lg">
          P
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">PayPro</p>
          <p className="text-[11px] text-slate-400">Shop Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href)
                const hasChildren = item.children && item.children.length > 0
                const isExpanded = expanded === item.label

                return (
                  <div key={item.label}>
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        if (hasChildren) {
                          e.preventDefault()
                          setExpanded(isExpanded ? null : item.label)
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                        active
                          ? "bg-emerald-600 text-white font-medium"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <item.icon size={18} />
                      <span className="flex-1">{item.label}</span>
                      {hasChildren && (
                        <span className="text-slate-400">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                    </Link>

                    {/* Submenu */}
                    {hasChildren && isExpanded && (
                      <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                        {item.children.map((child) => {
                          const childActive = pathname === child.href
                          return (
                            <Link
                              key={child.label}
                              href={child.href}
                              className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                childActive
                                  ? "text-emerald-400 font-medium"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {child.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Card with Dropdown */}
      <div className="p-3 relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{shopName}</p>
            <p className="text-[11px] text-slate-400">Shop ID: {shopId || "—"}</p>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setShowUserMenu(false)}
            >
              <User size={16} className="text-slate-400" />
              Profile
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setShowUserMenu(false)}
            >
              <Settings size={16} className="text-slate-400" />
              Settings
            </Link>
            <div className="border-t border-slate-100" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
