"use client"

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-muted rounded-lg"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-muted rounded-lg"></div>
        <div className="h-24 bg-muted rounded-lg"></div>
        <div className="h-24 bg-muted rounded-lg"></div>
      </div>
      <div className="h-48 bg-muted rounded-lg"></div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 bg-muted rounded-lg"></div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted rounded-lg"></div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return <div className="h-40 bg-muted rounded-lg animate-pulse"></div>
}
