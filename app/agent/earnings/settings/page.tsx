"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, User, Lock, Bell, CreditCard, Shield, ArrowLeft, Save } from "lucide-react"
import { createAgentClient } from "@/lib/supabase/agent-client"
import { MainLayout } from "@/components/layout/main-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const settingsTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "password", label: "Password", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "bank", label: "Bank Account", icon: CreditCard },
  { id: "kyc", label: "KYC", icon: Shield },
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createAgentClient()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentName, setAgentName] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  const [saving, setSaving] = useState(false)

  // Profile form
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", city: "" })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/agent-login"); return }
      const { data: agent } = await supabase.from("agents").select("id, name, email, phone, city").eq("user_id", user.id).single()
      if (!agent) { router.push("/auth/agent-login"); return }
      setAgentId(agent.id)
      setAgentName(agent.name)
      setProfile({
        name: agent.name || "",
        email: agent.email || "",
        phone: agent.phone || "",
        city: agent.city || "",
      })
      setLoading(false)
    }
    checkAuth()
  }, [router, supabase])

  const handleSave = async () => {
    if (!agentId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("agents")
        .update({ name: profile.name, email: profile.email, phone: profile.phone, city: profile.city })
        .eq("id", agentId)
      if (error) throw error
      alert("Settings saved!")
    } catch (e) {
      console.error(e)
      alert("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!agentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <MainLayout title="Settings" isAgent={true} userName={agentName} agentId={agentId}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="outline" size="sm" onClick={() => router.push("/agent/dashboard")} className="mb-3 border-slate-200 gap-1.5">
            <ArrowLeft size={16} /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your profile, security, and preferences</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Tabs */}
            <Card className="bg-white border-slate-100 shadow-sm h-fit">
              <div className="p-2 space-y-1">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Content */}
            <div className="lg:col-span-3">
              <Card className="bg-white border-slate-100 shadow-sm p-6">
                {activeTab === "profile" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <Input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <Input
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <Input
                          value={profile.city}
                          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                          className="border-slate-200"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                      <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}

                {activeTab === "password" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                        <Input type="password" placeholder="Enter current password" className="border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <Input type="password" placeholder="Enter new password" className="border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                        <Input type="password" placeholder="Confirm new password" className="border-slate-200" />
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">Update Password</Button>
                    </div>
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Notification Preferences</h2>
                    <div className="space-y-3">
                      {["Email notifications for new shop requests", "SMS alerts for payout processing", "Weekly earnings summary", "Monthly performance report"].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50">
                          <span className="text-sm text-slate-700">{item}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "bank" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Bank Account Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                        <Input placeholder="Enter account holder name" className="border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                        <Input placeholder="Enter bank name" className="border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                        <Input placeholder="Enter account number" className="border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                        <Input placeholder="Enter IFSC code" className="border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UPI ID</label>
                        <Input placeholder="Enter UPI ID" className="border-slate-200" />
                      </div>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Bank Details</Button>
                  </div>
                )}

                {activeTab === "kyc" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">KYC Verification</h2>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        <strong>Status:</strong> Pending Verification
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Please upload your PAN card and Aadhaar card to complete KYC.
                      </p>
                    </div>
                    <div className="space-y-4 max-w-lg">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">PAN Card</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                          <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                          <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Aadhaar Card</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                          <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                          <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">Submit for Verification</Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}