-- SQLite schema for the Commission & Payroll system.
-- Converted from the original Neon/Postgres schema. Functionally equivalent.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unique_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255),
  account_number VARCHAR(50),
  bank_name VARCHAR(100),
  ifsc_code VARCHAR(20),
  upi_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  total_commission_this_month DECIMAL(12, 2) DEFAULT 0,
  total_sales_this_month DECIMAL(12, 2) DEFAULT 0,
  current_tier_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_agent_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  commission_rate DECIMAL(5, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, agent_id)
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,
  sale_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
  person_type VARCHAR(20) DEFAULT 'agent',
  amount_paid DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  staff_id INT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  log_type VARCHAR(20) NOT NULL,
  logged_at TIME NOT NULL,
  status VARCHAR(20) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(100) NOT NULL,
  salary_type VARCHAR(20) NOT NULL,
  base_salary DECIMAL(12, 2) NOT NULL,
  join_date DATE NOT NULL,
  description TEXT,
  account_name VARCHAR(255),
  account_number VARCHAR(50),
  bank_name VARCHAR(100),
  ifsc_code VARCHAR(20),
  upi_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  work_hours DECIMAL(5, 2) DEFAULT 8,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  withdrawal_date DATE NOT NULL,
  purpose VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_days INT DEFAULT 30,
  present_days INT DEFAULT 0,
  absent_days INT DEFAULT 0,
  base_salary DECIMAL(12, 2) NOT NULL,
  overtime_amount DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  advances DECIMAL(12, 2) DEFAULT 0,
  final_payable DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, month)
);

CREATE TABLE IF NOT EXISTS productivity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  productivity_date DATE NOT NULL,
  tasks_completed INT DEFAULT 0,
  output_value DECIMAL(12, 2) DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_agent_links_shop_id ON shop_agent_links(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_agent_links_agent_id ON shop_agent_links(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_agent_id ON sales(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_staff_shop_id ON staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_withdrawals_staff_id ON withdrawals(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_staff_id ON salary(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_month ON salary(month);
CREATE INDEX IF NOT EXISTS idx_payouts_shop_id ON payouts(shop_id);
CREATE INDEX IF NOT EXISTS idx_payouts_agent_id ON payouts(agent_id);
