"use client"

import { useRouter } from "next/navigation"
import { Bell, User } from "lucide-react"

interface HeaderProps {
  title: string
  subtitle?: string
  shopName?: string
}

export function Header({ title, subtitle, shopName }: HeaderProps) {
  const router = useRouter()

  return (
    <header className="bg-card border-b border-border">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          {shopName && <p className="text-xs text-muted-foreground mt-1">Shop: {shopName}</p>}
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
            <Bell size={20} className="text-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <User size={20} className="text-foreground" />
          </button>
        </div>
      </div>
    </header>
  )
}
