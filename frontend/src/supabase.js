import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || 'https://ubvcqilwpexcepqblgwb.supabase.com'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1pjAKz0hgnkdXbLhX411kA_0MXqkfWK'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
