// app/agent/commissions/loading.tsx
export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="h-4 w-64 bg-slate-200 rounded" />

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 h-24" />
        ))}
      </div>

      {/* Charts row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl h-64 border border-slate-100" />
        <div className="space-y-4">
          <div className="bg-white rounded-xl h-40 border border-slate-100" />
          <div className="bg-white rounded-xl h-40 border border-slate-100" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl h-96 border border-slate-100" />
    </div>
  )
}