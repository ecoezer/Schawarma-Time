import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhwzlbrwiayllslwsnra.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJod3psYnJ3aWF5bGxzbHdzbnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTMyMTgsImV4cCI6MjA5MTE2OTIxOH0.Yz3sawnpGz61bhrHWRdqZKEmJqGLYvuQ3rYeN_94mSM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Error:', error);
  console.log('Data:', data);
  
  // also check another table if profiles fails
  const { data: d2, error: e2 } = await supabase.from('users').select('*');
  if (e2) console.log('Users Error:', e2);
  else console.log('Users Data:', d2);
}

test();
