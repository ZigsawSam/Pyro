"use client"

import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const [theme, setThemeState] = useState<string>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const current = saved || (prefersDark ? "dark" : "light")
    setThemeState(current)
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
    // Dispatch storage event for other components
    window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: theme }))
  }, [theme, mounted])

  const toggle = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"))
  }

  if (!mounted) {
    return (
      <button className="p-2 rounded-xl bg-secondary/50 w-10 h-10" aria-label="Toggle theme">
        <span className="sr-only">Loading</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className="theme-toggle p-2 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 transition-all duration-300 focus-ring-animate"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun size={18} className="text-amber-400" />
      ) : (
        <Moon size={18} className="text-primary" />
      )}
    </button>
  )
}
