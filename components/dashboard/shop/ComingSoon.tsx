"use client"

import { Construction, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ComingSoonProps {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}

export function ComingSoon({
  title = "Coming Soon",
  description = "This feature is under development. Check back later!",
  backHref,
  backLabel = "Go Back",
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mb-6">
        <Construction size={40} className="text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-slate-500 max-w-sm mb-8">{description}</p>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      )}
    </div>
  )
}
