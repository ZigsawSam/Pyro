"use client"

import type { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

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
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar shopId={shopId} isAgent={isAgent} userName={userName} />
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-[240px]">
        <Header
          title={title}
          subtitle={subtitle}
          shopName={shopName}
          shopId={shopId}
          isAgent={isAgent}
          agentName={userName}
          agentId={agentId}
        />
        <div className="flex-1 overflow-auto">
          <div className="p-6 animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  )
}
