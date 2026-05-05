import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || 'https://ubvcqilwpexcepqblgwb.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVidmNxaWx3cGV4Y2VwcWJsZ3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NzY4ODIsImV4cCI6MjA5MzU1Mjg4Mn0.0ZFRf8TO3aFwbfJsoMFDY9nbBHjo6ML6HDGv7l8fBvQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
