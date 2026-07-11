"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadCsv } from "@/lib/csv-export"

interface CsvExportButtonProps {
  data: Record<string, string | number>[]
  filename: string
  label?: string
  disabled?: boolean
}

export function CsvExportButton({
  data,
  filename,
  label = "Export CSV",
  disabled = false,
}: CsvExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    if (data.length === 0) return
    setExporting(true)
    // Small delay to show loading state
    setTimeout(() => {
      downloadCsv(data, filename)
      setExporting(false)
    }, 300)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || exporting || data.length === 0}
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {exporting ? "Exporting..." : label}
    </Button>
  )
}
