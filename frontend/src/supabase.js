import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ubvcqilwpexcepqblgwb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVidmNxaWx3cGV4Y2VwcWJsZ3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NzY4ODIsImV4cCI6MjA5MzU1Mjg4Mn0.0ZFRf8TO3aFwbfJsoMFDY9nbBHjo6ML6HDGv7l8fBvQ'
)
