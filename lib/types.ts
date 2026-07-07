// Shop types
export interface Shop {
  id: number
  shop_name: string
  owner_name: string
  phone: string
  email: string
  city?: string
  state?: string
  created_at: Date
  updated_at: Date
}

// Agent types
export interface Agent {
  id: number
  unique_id: string
  name: string
  phone_number: string
  account_name?: string
  account_number?: string
  bank_name?: string
  ifsc_code?: string
  upi_id?: string
  is_active: boolean
  total_commission_this_month: number
  total_sales_this_month: number
  created_at: Date
  updated_at: Date
}

// Shop-Agent Link
export interface ShopAgentLink {
  id: number
  shop_id: number
  agent_id: number
  commission_rate: number
  status: "active" | "inactive"
  created_at: Date
}

// Sales
export interface Sale {
  id: number
  shop_id: number
  agent_id: number
  amount: number
  commission_amount: number
  sale_date: Date
  notes?: string
  created_at: Date
}

// Staff
export interface Staff {
  id: number
  shop_id: number
  name: string
  phone?: string
  role: string
  salary_type: "monthly" | "daily" | "hourly"
  base_salary: number
  join_date: Date
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// Attendance
export interface Attendance {
  id: number
  staff_id: number
  shop_id: number
  attendance_date: Date
  status: "present" | "absent" | "half"
  work_hours: number
  overtime_hours: number
  created_at: Date
}

// Salary
export interface Salary {
  id: number
  staff_id: number
  shop_id: number
  month: Date
  total_days: number
  present_days: number
  absent_days: number
  base_salary: number
  overtime_amount: number
  deductions: number
  advances: number
  final_payable: number
  status: "pending" | "paid"
  created_at: Date
}
