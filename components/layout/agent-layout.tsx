// components/layout/agent-layout.tsx
export function AgentLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">{title}</h1>
      </header>
      <main className="p-6 max-w-5xl mx-auto space-y-6">{children}</main>
    </div>
  )
}