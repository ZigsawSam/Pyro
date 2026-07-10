import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Commission & Payroll System",
  description: "Multi-tenant commission and payroll management platform",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
// force rebuild Thu 09 Jul 2026 08:57:25 PM IST
// rebuild Fri 10 Jul 2026 08:38:52 AM IST
// force rebuild Fri 10 Jul 2026 11:14:37 AM IST
