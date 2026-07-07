"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { clearAllStorage } from "@/lib/storage-utils"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear all storage
    clearAllStorage()

    // Redirect after a brief delay for visual feedback
    const timer = setTimeout(() => {
      router.push("/")
    }, 500)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  )
}
