// Supabase auth helpers
import { createClient } from "@/lib/supabase/client"

export async function signUp(email: string, password: string, metadata?: any) {
  const supabase = createClient()
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  })
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  return await supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  const supabase = createClient()
  return await supabase.auth.signOut()
}

export function generateAgentId() {
  return 'AGT_' + Math.random().toString(36).substring(2, 10).toUpperCase()
}
