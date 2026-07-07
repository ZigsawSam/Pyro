import crypto from "crypto"

// Hash password using SHA256 (for demo - use bcrypt in production)
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

// Verify password
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

// Generate unique agent ID
export function generateAgentId(): string {
  return `AGT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Session utilities with proper typing
export interface ShopSession {
  id: number
  shop_name: string
  owner_name: string
  email: string
}

export interface AgentSession {
  id: number
  unique_id: string
  name: string
  phone_number: string
}

export function createShopSession(shop: ShopSession): string {
  return JSON.stringify({
    ...shop,
    type: "shop",
    timestamp: Date.now(),
  })
}

export function createAgentSession(agent: AgentSession): string {
  return JSON.stringify({
    ...agent,
    type: "agent",
    timestamp: Date.now(),
  })
}

export function parseSession(sessionData: string | null): ShopSession | AgentSession | null {
  if (!sessionData) return null
  try {
    const parsed = JSON.parse(sessionData)
    if (parsed && typeof parsed === "object" && "id" in parsed) {
      return parsed
    }
    return null
  } catch (error) {
    console.error("[v0] Error parsing session:", error)
    return null
  }
}
