"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Plus, Phone, User } from "lucide-react"
import { createShopClient } from "@/lib/supabase/shop-client"
import { MainLayout } from "@/components/layout/main-layout"
import { StaffProfileDialog } from "@/components/staff/staff-profile-dialog"
import { PayStaffDialog } from "@/components/staff/pay-staff-dialog"

interface StaffMember {
  id: number
  name: string
  phone: string
  role: string
  salary_type: string
  base_salary: number
  today_due: number
  pending_payroll: number
  paid_payroll: number
  is_active: boolean
}

export default function ShopStaffPage() {
  const router = useRouter()
  const supabase = createShopClient()
  const params = useParams()
  const shopId = Number(params?.shopId)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [profileStaff, setProfileStaff] = useState<StaffMember | null>(null)
  const [payStaff, setPayStaff] = useState<StaffMember | null>(null)

  // Form state for adding new staff
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStaff, setNewStaff] = useState({
    name: "",
    phone: "",
    role: "",
    salary_type: "monthly",
    base_salary: "",
    working_hours_per_day: "8",
    overtime_rate: "0",
  })

  useEffect(() => {
    fetchStaff()
  }, [shopId])

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("shop_id", shopId)
        .order("name")

      if (error) throw error

      // Calculate payroll stats
      const staffIds = (data || []).map((s: any) => s.id)
      
      let salaryData: any[] = []
      if (staffIds.length > 0) {
        const { data: salaries } = await supabase
          .from("salary")
          .select("staff_id, final_payable, status")
          .eq("shop_id", shopId)
          .in("staff_id", staffIds)
        
        salaryData = salaries || []
      }

      const pendingByStaff = salaryData.reduce((acc: any, s: any) => {
        if (s.status === "pending") {
          acc[s.staff_id] = (acc[s.staff_id] || 0) + Number(s.final_payable || 0)
        }
        return acc
      }, {})

      const paidByStaff = salaryData.reduce((acc: any, s: any) => {
        if (s.status === "paid") {
          acc[s.staff_id] = (acc[s.staff_id] || 0) + Number(s.final_payable || 0)
        }
        return acc
      }, {})

      const formattedStaff: StaffMember[] = (data || []).map((s: any) => ({
        ...s,
        pending_payroll: pendingByStaff[s.id] || 0,
        paid_payroll: paidByStaff[s.id] || 0,
        today_due: 0, // Calculate based on attendance if needed
      }))

      setStaff(formattedStaff)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async () => {
    try {
      const { error } = await supabase.from("staff").insert({
        shop_id: shopId,
        name: newStaff.name,
        phone: newStaff.phone,
        role: newStaff.role,
        salary_type: newStaff.salary_type,
        base_salary: Number(newStaff.base_salary),
        join_date: new Date().toISOString().split("T")[0],
      })

      if (error) throw error

      setNewStaff({ name: "", phone: "", role: "", salary_type: "monthly", base_salary: "", working_hours_per_day: "8", overtime_rate: "0" })
      setShowAddForm(false)
      fetchStaff()
    } catch (e) {
      console.error(e)
      alert("Failed to add staff")
    }
  }

  const filteredStaff = staff.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery)
  )

  return (
    <MainLayout title="Staff" shopId={shopId}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Staff
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Add New Staff</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Name" value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} />
            <Input placeholder="Phone" value={newStaff.phone} onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})} />
            <Input placeholder="Role" value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})} />
            <select
              value={newStaff.salary_type}
              onChange={(e) => setNewStaff({...newStaff, salary_type: e.target.value})}
              className="w-full rounded border border-input bg-background px-3 py-2"
            >
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
            </select>
            <Input type="number" placeholder="Base Salary" value={newStaff.base_salary} onChange={(e) => setNewStaff({...newStaff, base_salary: e.target.value})} />
            <Input type="number" placeholder="Working Hours/Day" value={newStaff.working_hours_per_day} onChange={(e) => setNewStaff({...newStaff, working_hours_per_day: e.target.value})} />
            <Input type="number" placeholder="Overtime Rate (₹/hr)" value={newStaff.overtime_rate} onChange={(e) => setNewStaff({...newStaff, overtime_rate: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddStaff}>Add Staff</Button>
          </div>
        </Card>
      )}

      <Input
        placeholder="Search staff..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredStaff.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" /> {member.name}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {member.phone}
                  </p>
                  <p className="text-sm">{member.role} • {member.salary_type} • ₹{Number(member.base_salary).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₹{Number(member.pending_payroll).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">pending</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => setProfileStaff(member)}>
                      Profile
                    </Button>
                    <Button size="sm" onClick={() => setPayStaff(member)}>
                      Pay
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filteredStaff.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No staff found</p>
          )}
        </div>
      )}

      {profileStaff && (
        <StaffProfileDialog
          open={!!profileStaff}
          onOpenChange={() => setProfileStaff(null)}
          shopId={shopId}
          staff={profileStaff}
          onUpdated={fetchStaff}
          onDeleted={fetchStaff}
        />
      )}

      {payStaff && (
        <PayStaffDialog
          open={!!payStaff}
          onOpenChange={() => setPayStaff(null)}
          shopId={shopId}
          staff={payStaff}
          onPaid={fetchStaff}
        />
      )}
    </MainLayout>
  )
}