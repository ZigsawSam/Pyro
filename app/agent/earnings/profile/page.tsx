"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, User, Mail, Phone, MapPin, Calendar, ArrowLeft, Edit3 } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/agent-login"); return }
      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, email, phone, city, state, created_at, user_id")
        .eq("user_id", user.id)
        .single()
      if (!agent) { router.push("/auth/agent-login"); return }
      setAgentId(agent.id)
      setAgentName(agent.name)
      setProfile(agent)
      setLoading(false)
    }
    checkAuth()
  }, [router, supabase])

  const initials = agentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Profile" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="outline" size="sm" onClick={() => router.push("/agent/dashboard")} className="mb-3 border-slate-200 gap-1.5">
            <ArrowLeft size={16} /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Your account details and information</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="bg-white border-slate-100 shadow-sm p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                {initials}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{agentName}</h2>
              <p className="text-sm text-slate-500">Agent</p>
              <p className="text-xs text-slate-400 mt-1">ID: AGT-{String(agentId).padStart(4, "0")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-slate-200 gap-1.5"
                onClick={() => router.push("/agent/settings")}
              >
                <Edit3 size={14} /> Edit Profile
              </Button>
            </Card>

            {/* Details */}
            <Card className="bg-white border-slate-100 shadow-sm p-6 lg:col-span-2">
              <h3 className="font-semibold text-slate-900 mb-4">Account Details</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 py-3 border-b border-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <User size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Full Name</p>
                    <p className="font-medium text-slate-900">{profile?.name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-b border-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Mail size={18} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium text-slate-900">{profile?.email || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-b border-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Phone size={18} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-medium text-slate-900">{profile?.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-b border-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <MapPin size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Location</p>
                    <p className="font-medium text-slate-900">
                      {profile?.city || ""}{profile?.state ? `, ${profile.state}` : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Calendar size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Member Since</p>
                    <p className="font-medium text-slate-900">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  )
}