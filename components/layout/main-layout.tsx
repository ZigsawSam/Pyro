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
}

export function MainLayout({
  children,
  title,
  subtitle,
  shopId,
  shopName,
  isAgent = false,
  userName,
}: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar shopId={shopId} isAgent={isAgent} userName={userName} />
      <main className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Header title={title} subtitle={subtitle} shopName={shopName} />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
