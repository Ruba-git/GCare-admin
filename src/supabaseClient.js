import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zukodinaswvoijraxamu.supabase.co'; // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1a29kaW5hc3d2b2lqcmF4YW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTcxMjAsImV4cCI6MjA5MzczMzEyMH0.20O8CpSfiMxy1zoyQoPIQLtCuunTDO4vSPAHydY4GrY'; // Replace with your Supabase anon key


let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (e) {
  console.error("Supabase init failed:", e);
  // Fallback mock to prevent crashes
  supabase = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: e })
      }),
      insert: () => Promise.resolve({ error: e })
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => { }
  };
}

export { supabase };
