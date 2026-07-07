// Safe storage utilities that work in browser and SSR contexts
type StorageKey = "shop_token" | "shop_session" | "agent_token" | "agent_session"

export function getStorageItem(key: StorageKey): string | null {
  if (typeof window === "undefined") return null
  try {
    const item = localStorage.getItem(key)
    return item || null
  } catch (e) {
    console.error(`[v0] Failed to read ${key} from storage`)
    return null
  }
}

export function setStorageItem(key: StorageKey, value: string): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    console.error(`[v0] Failed to write ${key} to storage`)
    return false
  }
}

export function removeStorageItem(key: StorageKey): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.error(`[v0] Failed to remove ${key} from storage`)
  }
}

export function clearAllStorage(): void {
  if (typeof window === "undefined") return
  try {
    removeStorageItem("shop_token")
    removeStorageItem("shop_session")
    removeStorageItem("agent_token")
    removeStorageItem("agent_session")
  } catch (e) {
    console.error("[v0] Failed to clear storage")
  }
}

// Session retrieval with validation
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

export function getShopSession(): ShopSession | null {
  try {
    const sessionStr = getStorageItem("shop_session")
    if (!sessionStr || typeof sessionStr !== "string" || sessionStr.trim() === "") {
      return null
    }

    const session = JSON.parse(sessionStr)
    if (session && typeof session === "object" && "id" in session && "shop_name" in session) {
      return session as ShopSession
    }
    return null
  } catch (error) {
    return null
  }
}

export function getAgentSession(): AgentSession | null {
  try {
    const sessionStr = getStorageItem("agent_session")
    if (!sessionStr || typeof sessionStr !== "string" || sessionStr.trim() === "") {
      return null
    }

    const session = JSON.parse(sessionStr)
    if (session && typeof session === "object" && "id" in session && "unique_id" in session) {
      return session as AgentSession
    }
    return null
  } catch (error) {
    return null
  }
}

export function getShopToken(): string | null {
  const token = getStorageItem("shop_token")
  return token && token.trim() ? token : null
}

export function getAgentToken(): string | null {
  const token = getStorageItem("agent_token")
  return token && token.trim() ? token : null
}
