"use client"

import type React from "react"
import { useEffect, useState } from "react"
import "./globals.css"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [theme, setTheme] = useState<string>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initial = saved || (prefersDark ? "dark" : "light")
    setTheme(initial)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("theme", theme)
  }, [theme, mounted])

  // Listen for theme changes from other tabs/components
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "theme" && e.newValue) {
        setTheme(e.newValue)
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  // Expose setTheme globally for the toggle
  useEffect(() => {
    if (mounted) {
      ;(window as any).__setTheme = setTheme
    }
  }, [mounted])

  return (
    <html lang="en" className={theme === "dark" ? "dark" : ""} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
