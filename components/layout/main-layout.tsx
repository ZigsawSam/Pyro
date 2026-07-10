"use client"

import type { ReactNode } from "react"
import { AgentSidebar } from "./AgentSidebar"
import { AgentHeader } from "./AgentHeader"
import { ShopSidebar } from "./ShopSidebar"
import { ShopHeader } from "./ShopHeader"

interface MainLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  shopId?: number
  shopName?: string
  isAgent?: boolean
  userName?: string
  agentId?: number
}

export function MainLayout({
  children,
  title,
  subtitle,
  shopId,
  shopName,
  isAgent = false,
  userName,
  agentId,
}: MainLayoutProps) {
  if (isAgent) {
    return (
      <div className="flex min-h-screen bg-[#f8fafc]">
        <AgentSidebar userName={userName} agentId={agentId} />
        <main className="flex-1 flex flex-col overflow-hidden lg:ml-[240px]">
          <AgentHeader title={title} subtitle={subtitle} agentName={userName} agentId={agentId} />
          <div className="flex-1 overflow-auto">
            <div className="p-6 animate-fade-in">{children}</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <ShopSidebar shopName={shopName} shopId={shopId} />
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-[240px]">
        <ShopHeader title={title} subtitle={subtitle} shopName={shopName} shopId={shopId} />
        <div className="flex-1 overflow-auto">
          <div className="p-6 animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  )
}
