"use client"

/**
 * Convert array of objects to CSV string
 */
function objectsToCsv(data: Record<string, string | number>[]): string {
  if (data.length === 0) return ""

  const headers = Object.keys(data[0])
  const csvRows: string[] = []

  // Header row
  csvRows.push(headers.join(","))

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      const stringValue = value === null || value === undefined ? "" : String(value)
      // Escape quotes and wrap in quotes if contains comma/newline/quote
      if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvRows.push(values.join(","))
  }

  return csvRows.join("\n")
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCsv(
  data: Record<string, string | number>[],
  filename: string
): void {
  const csv = objectsToCsv(data)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format currency for CSV export
 */
export function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`
}

/**
 * Format date for CSV export
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}
