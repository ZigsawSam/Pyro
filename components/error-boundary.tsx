"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  try {
    return <>{children}</>
  } catch (error) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md p-8 border border-destructive/20">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-foreground mb-1">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">Please try refreshing the page or contact support.</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = "/"
              }}
            >
              Go Home
            </Button>
          </Card>
        </div>
      )
    )
  }
}
