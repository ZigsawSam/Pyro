"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
export default function RedirectAgentLogin() {
  const router = useRouter()
  useEffect(() => { router.replace("/auth/login") }, [router])
  return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Redirecting...</div></div>
}
