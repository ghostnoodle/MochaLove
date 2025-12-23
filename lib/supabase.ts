import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ioscbfcleqiclevlokmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2NiZmNsZXFpY2xldmxva21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTc5NTcsImV4cCI6MjA4MTY3Mzk1N30.F2QdEjep6U7NnjZHBHazB0Ctuwr9iJyvpQ1vF-v9MKk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
