import path from "node:path"
import fs from "node:fs"
import crypto from "node:crypto"
import Database from "better-sqlite3"

// ---------------------------------------------------------------------------
// This app ships with a zero-config, file-based SQLite database so it can run
// on any local computer with no external services, accounts, or connection
// strings. The database file lives at ./data/payroll.db and is created (and
// seeded with demo data) automatically the first time the server starts.
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data")
const DB_PATH = path.join(DATA_DIR, "payroll.db")
const SCHEMA_PATH = path.join(process.cwd(), "scripts", "init-db.sqlite.sql")

let db: Database.Database | null = null

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

function formatToChar(value: unknown, fmt: string): string | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  if (fmt === "Mon YYYY") return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  return String(value)
}

function dateTrunc(part: string, value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  if (part === "month") {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`
  }
  if (part === "year") return `${d.getUTCFullYear()}-01-01`
  if (part === "day") return String(value).slice(0, 10)
  return String(value)
}

function registerFunctions(database: Database.Database) {
  database.function("NOW", () => new Date().toISOString())
  database.function("TO_CHAR", (value: unknown, fmt: unknown) => formatToChar(value, String(fmt)))
  database.function("DATE_TRUNC", (part: unknown, value: unknown) => dateTrunc(String(part), value))
}

function applySchema(database: Database.Database) {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8")
  database.exec(schema)
}

function ensureAgentColumns(database: Database.Database) {
  const columns = database.prepare("PRAGMA table_info(agents)").all() as Array<{ name: string }>
  const hasDescription = columns.some((column) => column.name === "description")
  if (!hasDescription) {
    database.exec("ALTER TABLE agents ADD COLUMN description TEXT")
  }
}

function ensureStaffColumns(database: Database.Database) {
  const columns = database.prepare("PRAGMA table_info(staff)").all() as Array<{ name: string }>
  const additions: Array<[string, string]> = [
    ["description", "TEXT"],
    ["account_name", "VARCHAR(255)"],
    ["account_number", "VARCHAR(50)"],
    ["bank_name", "VARCHAR(100)"],
    ["ifsc_code", "VARCHAR(20)"],
    ["upi_id", "VARCHAR(100)"],
  ]

  for (const [name, type] of additions) {
    if (!columns.some((column) => column.name === name)) {
      database.exec(`ALTER TABLE staff ADD COLUMN ${name} ${type}`)
    }
  }
}

function ensurePayoutColumns(database: Database.Database) {
  let columns = database.prepare("PRAGMA table_info(payouts)").all() as Array<{ name: string; notnull: number; dflt_value: any }>
  
  const agentIdCol = columns.find((c) => c.name === "agent_id")
  if (agentIdCol && agentIdCol.notnull === 1) {
    database.exec(`
      CREATE TABLE payouts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
        staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
        person_type VARCHAR(20) DEFAULT 'agent',
        amount_paid DECIMAL(12, 2) NOT NULL,
        payment_date DATE NOT NULL,
        remarks TEXT,
        is_advance INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    database.exec(`
      INSERT INTO payouts_new (id, shop_id, agent_id, amount_paid, payment_date, remarks, created_at)
      SELECT id, shop_id, agent_id, amount_paid, payment_date, remarks, created_at
      FROM payouts
    `)
    database.exec(`DROP TABLE payouts`)
    database.exec(`ALTER TABLE payouts_new RENAME TO payouts`)
    columns = database.prepare("PRAGMA table_info(payouts)").all() as Array<{ name: string; notnull: number; dflt_value: any }>
  }

  const additions: Array<[string, string]> = [
    ["person_type", "VARCHAR(20) DEFAULT 'agent'"],
    ["staff_id", "INT REFERENCES staff(id) ON DELETE SET NULL"],
    ["is_advance", "INTEGER DEFAULT 0"],
  ]

  for (const [name, type] of additions) {
    if (!columns.some((column) => column.name === name)) {
      database.exec(`ALTER TABLE payouts ADD COLUMN ${name} ${type}`)
    }
  }
}

function ensureAttendanceLogTable(database: Database.Database) {
  database.exec(`
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
    )
  `)
}

function ensureAgentLinkRequestsTable(database: Database.Database) {
  // Check if table exists with old unique constraint
  const tableInfo = database.prepare("PRAGMA table_info(agent_link_requests)").all() as any[]
  
  if (tableInfo.length > 0) {
    // Table exists — check if we need to migrate (old version had UNIQUE constraint)
    const indexes = database.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='agent_link_requests'").all() as any[]
    const hasUniqueConstraint = indexes.some(idx => idx.sql && idx.sql.includes('UNIQUE'))
    
    if (hasUniqueConstraint) {
      // Migrate: recreate table without unique constraint
      database.exec(`
        CREATE TABLE agent_link_requests_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
          agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          commission_rate REAL NOT NULL DEFAULT 0,
          status TEXT DEFAULT 'pending',
          requested_by TEXT NOT NULL,
          message TEXT,
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          responded_at TIMESTAMP
        )
      `)
      
      // Copy existing data
      database.exec(`
        INSERT INTO agent_link_requests_new (id, shop_id, agent_id, commission_rate, status, requested_by, message, requested_at, responded_at)
        SELECT id, shop_id, agent_id, commission_rate, status, requested_by, message, requested_at, responded_at
        FROM agent_link_requests
      `)
      
      database.exec(`DROP TABLE agent_link_requests`)
      database.exec(`ALTER TABLE agent_link_requests_new RENAME TO agent_link_requests`)
    }
  } else {
    // Create new table
    database.exec(`
      CREATE TABLE agent_link_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        commission_rate REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        requested_by TEXT NOT NULL,
        message TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP
      )
    `)
  }
  
  // Create non-unique index for performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_link_requests_shop_agent 
    ON agent_link_requests(shop_id, agent_id)
  `)
}

function seedDemoData(database: Database.Database) {
  const existing = database.prepare("SELECT COUNT(*) as count FROM shops").get() as { count: number }
  if (existing.count > 0) return

  const insertShop = database.prepare(`
    INSERT INTO shops (shop_name, owner_name, phone, email, password_hash, city, state)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const shopInfo = insertShop.run(
    "Tiles & Marble Co.",
    "Rohan Mehta",
    "9820012345",
    "admin@tiles.com",
    hashPassword("password123"),
    "Ahmedabad",
    "Gujarat",
  )
  const shopId = Number(shopInfo.lastInsertRowid)

  const insertAgent = database.prepare(`
    INSERT INTO agents (unique_id, name, phone_number, account_name, account_number, bank_name, ifsc_code, upi_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `)
  const agents = [
    { id: "AGT_DEMO_1", name: "Priya Sharma", phone: "9876543210", acct: "Priya Sharma", accNo: "12345678901", bank: "HDFC Bank", ifsc: "HDFC0001234", upi: "priya@okhdfcbank" },
    { id: "AGT_DEMO_2", name: "Arjun Patel", phone: "9876500001", acct: "Arjun Patel", accNo: "22345678901", bank: "ICICI Bank", ifsc: "ICIC0005678", upi: "arjun@okicici" },
    { id: "AGT_DEMO_3", name: "Kavita Nair", phone: "9876500002", acct: "Kavita Nair", accNo: "32345678901", bank: "SBI", ifsc: "SBIN0009876", upi: "kavita@oksbi" },
  ]
  const agentIds: number[] = []
  for (const a of agents) {
    const r = insertAgent.run(a.id, a.name, a.phone, a.acct, a.accNo, a.bank, a.ifsc, a.upi)
    agentIds.push(Number(r.lastInsertRowid))
  }

  const insertLink = database.prepare(`
    INSERT INTO shop_agent_links (shop_id, agent_id, commission_rate, status) VALUES (?, ?, ?, 'active')
  `)
  const rates = [5, 7.5, 6]
  agentIds.forEach((agentId, i) => insertLink.run(shopId, agentId, rates[i]))

  const insertSale = database.prepare(`
    INSERT INTO sales (shop_id, agent_id, amount, commission_amount, sale_date, notes) VALUES (?, ?, ?, ?, ?, ?)
  `)
  const today = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return d.toISOString().slice(0, 10)
  }
  const demoSales = [
    { agent: 0, amount: 45000, days: 2, notes: "Vitrified tiles - retail order" },
    { agent: 0, amount: 32000, days: 6, notes: "Bathroom fittings" },
    { agent: 1, amount: 68000, days: 3, notes: "Marble flooring - Villa project" },
    { agent: 1, amount: 21000, days: 10, notes: "Sample order" },
    { agent: 2, amount: 54000, days: 1, notes: "Granite countertops" },
  ]
  for (const s of demoSales) {
    const agentId = agentIds[s.agent]
    const rate = rates[s.agent]
    const commission = Math.round(((s.amount * rate) / 100) * 100) / 100
    insertSale.run(shopId, agentId, s.amount, commission, daysAgo(s.days), s.notes)
  }

  const insertPayout = database.prepare(`
    INSERT INTO payouts (shop_id, agent_id, amount_paid, payment_date, remarks) VALUES (?, ?, ?, ?, ?)
  `)
  insertPayout.run(shopId, agentIds[0], 2250, daysAgo(5), "Partial commission payout")

  const insertStaff = database.prepare(`
    INSERT INTO staff (shop_id, name, phone, role, salary_type, base_salary, join_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `)
  const staffList = [
    { name: "Deepak Joshi", role: "Store Manager", type: "monthly", salary: 28000, phone: "9900011111" },
    { name: "Meena Iyer", role: "Sales Associate", type: "monthly", salary: 18000, phone: "9900022222" },
    { name: "Ramesh Yadav", role: "Warehouse Staff", type: "daily", salary: 700, phone: "9900033333" },
  ]
  const staffIds: number[] = []
  for (const st of staffList) {
    const r = insertStaff.run(shopId, st.name, st.phone, st.role, st.type, st.salary, daysAgo(180))
    staffIds.push(Number(r.lastInsertRowid))
  }

  const insertAttendance = database.prepare(`
    INSERT INTO attendance (staff_id, shop_id, attendance_date, status) VALUES (?, ?, ?, ?)
  `)
  for (const staffId of staffIds) {
    for (let i = 0; i < 10; i++) {
      const status = i % 7 === 0 ? "absent" : "present"
      insertAttendance.run(staffId, shopId, daysAgo(i), status)
    }
  }
}

function initDatabase(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const database = new Database(DB_PATH)
  database.exec("PRAGMA journal_mode = WAL;")
  database.exec("PRAGMA foreign_keys = ON;")
  registerFunctions(database)
  applySchema(database)
  ensureAgentColumns(database)
  ensureStaffColumns(database)
  ensurePayoutColumns(database)
  ensureAttendanceLogTable(database)
  ensureAgentLinkRequestsTable(database)
  seedDemoData(database)
  return database
}

function getConnection(): Database.Database {
  if (!db) {
    db = initDatabase()
  }
  return db
}

function normalizeParam(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0
  if (value === undefined) return null
  return value
}

function sqlTag(strings: TemplateStringsArray, ...values: unknown[]) {
  const database = getConnection()

  let text = strings[0]
  const params: unknown[] = []
  for (let i = 0; i < values.length; i++) {
    params.push(normalizeParam(values[i]))
    text += "?" + strings[i + 1]
  }

  text = text.replace(/::\w+/g, "")

  const trimmedUpper = text.trim().toUpperCase()
  const returnsRows = trimmedUpper.startsWith("SELECT") || trimmedUpper.startsWith("WITH") || /RETURNING/i.test(text)

  try {
    const stmt = database.prepare(text)
    const rows = returnsRows ? stmt.all(...(params as any[])) : (stmt.run(...(params as any[])), [])
    return Promise.resolve(rows as any[])
  } catch (error) {
    return Promise.reject(error)
  }
}

export function getDb() {
  return sqlTag as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>
}

export async function getShop(shopId: number) {
  const sql = getDb()
  const result = await sql`
    SELECT id, shop_name, owner_name, phone, email, city, state, created_at
    FROM shops WHERE id = ${shopId}
  `
  return result[0] || null
}

export async function getAgent(agentId: number) {
  const sql = getDb()
  const result = await sql`
    SELECT * FROM agents WHERE id = ${agentId}
  `
  return result[0] || null
}

export async function getAgentByPhone(phone: string) {
  const sql = getDb()
  const result = await sql`
    SELECT * FROM agents WHERE phone_number = ${phone}
  `
  return result[0] || null
}

export async function getShopAgent(shopId: number, agentId: number) {
  const sql = getDb()
  const result = await sql`
    SELECT * FROM shop_agent_links 
    WHERE shop_id = ${shopId} AND agent_id = ${agentId}
  `
  return result[0] || null
}

export async function getActiveShopAgent(shopId: number, agentId: number) {
  const sql = getDb()
  const result = await sql`
    SELECT * FROM shop_agent_links 
    WHERE shop_id = ${shopId} AND agent_id = ${agentId} AND status = 'active'
  `
  return result[0] || null
}

export async function getPendingLinkRequest(shopId: number, agentId: number) {
  const sql = getDb()
  const result = await sql`
    SELECT * FROM agent_link_requests 
    WHERE shop_id = ${shopId} AND agent_id = ${agentId} AND status = 'pending'
  `
  return result[0] || null
}

export async function getStaffMember(staffId: number, shopId: number) {
  const sql = getDb()
  const result = await sql`
    SELECT * FROM staff 
    WHERE id = ${staffId} AND shop_id = ${shopId}
  `
  return result[0] || null
}

export async function getAgentShops(agentId: number) {
  const sql = getDb()
  const result = await sql`
    SELECT s.*, sal.commission_rate, sal.id as link_id
    FROM shops s
    JOIN shop_agent_links sal ON sal.shop_id = s.id
    WHERE sal.agent_id = ${agentId} AND sal.status = 'active'
    ORDER BY s.shop_name
  `
  return result
}

export async function getAgentShopStats(agentId: number, shopId: number) {
  const sql = getDb()
  const result = await sql`
    SELECT 
      COALESCE(SUM(s.amount), 0) as total_sales,
      COALESCE(SUM(s.commission_amount), 0) as total_commission,
      COALESCE(SUM(CASE WHEN p.is_advance = 0 THEN p.amount_paid ELSE 0 END), 0) as paid_commission,
      COALESCE(SUM(CASE WHEN p.is_advance = 1 THEN p.amount_paid ELSE 0 END), 0) as total_advance,
      CASE 
        WHEN COALESCE(SUM(s.commission_amount), 0) - COALESCE(SUM(CASE WHEN p.is_advance = 0 THEN p.amount_paid ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN p.is_advance = 1 THEN p.amount_paid ELSE 0 END), 0) < 0 
        THEN 0 
        ELSE COALESCE(SUM(s.commission_amount), 0) - COALESCE(SUM(CASE WHEN p.is_advance = 0 THEN p.amount_paid ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN p.is_advance = 1 THEN p.amount_paid ELSE 0 END), 0) 
      END as pending_commission
    FROM sales s
    LEFT JOIN payouts p ON p.shop_id = s.shop_id AND p.agent_id = s.agent_id AND p.person_type = 'agent'
    WHERE s.shop_id = ${shopId} AND s.agent_id = ${agentId}
  `
  return result[0] || null
}