import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="border-b px-6 py-4">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      </header>
      
      {/* Content skeleton */}
      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    </div>
  )
}