"use client"

import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface ShopSearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearch: () => void
  searching: boolean
  cityFilter?: string
  onCityFilterChange?: (city: string) => void
  cities?: string[]
}

export function ShopSearchFilter({
  searchQuery,
  onSearchChange,
  onSearch,
  searching,
  cityFilter,
  onCityFilterChange,
  cities = [],
}: ShopSearchFilterProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, owner, phone, or city..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="pl-10 border-slate-200"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 rounded-lg border transition-colors flex items-center gap-1.5 text-sm font-medium ${
            showFilters
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
          {cities.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">City:</span>
              <select
                value={cityFilter || ""}
                onChange={(e) => onCityFilterChange?.(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900"
              >
                <option value="">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => {
              onSearchChange("")
              onCityFilterChange?.("")
            }}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 ml-auto"
          >
            <X size={14} /> Clear
          </button>
        </div>
      )}
    </div>
  )
}