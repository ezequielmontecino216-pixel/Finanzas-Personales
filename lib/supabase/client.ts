import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Cliente de Supabase para uso en el navegador
export const supabase = createClient(supabaseUrl, supabaseKey)

// Cliente con secret key para uso en el servidor (API routes)
export function createServerClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY!
  return createClient(supabaseUrl, secretKey)
}
