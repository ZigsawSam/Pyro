"use client"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import type { ReactNode } from "react"

interface DashboardCardProps {
  children: ReactNode
  className?: string
  padding?: "none" | "sm" | "md" | "lg"
}

export function DashboardCard({ children, className, padding = "md" }: DashboardCardProps) {
  const paddingMap = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  }

  return (
    <Card className={cn(
      "bg-white border-slate-200 shadow-sm",
      paddingMap[padding],
      className
    )}>
      {children}
    </Card>
  )
}