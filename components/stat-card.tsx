import type React from "react"
interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  variant?: "primary" | "secondary" | "accent"
}

export function StatCard({ label, value, subtext, icon, variant = "primary" }: StatCardProps) {
  const variantClasses = {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${variantClasses[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
