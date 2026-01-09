import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Supabase: URL:', supabaseUrl)
console.log('🔍 Supabase: Anon Key present:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase: Missing environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
