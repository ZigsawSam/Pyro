import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export function hashPassword(password: string): string {
  const crypto = require("node:crypto")
  return crypto.createHash("sha256").update(password).digest("hex")
}
