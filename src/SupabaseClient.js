import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true, // ⚡ This ensures session is stored in localStorage
      autoRefreshToken: true
    }
  }
)

export default supabase