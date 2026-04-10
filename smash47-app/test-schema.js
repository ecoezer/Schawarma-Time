import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://bhwzlbrwiayllslwsnra.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJod3psYnJ3aWF5bGxzbHdzbnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTMyMTgsImV4cCI6MjA5MTE2OTIxOH0.Yz3sawnpGz61bhrHWRdqZKEmJqGLYvuQ3rYeN_94mSM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { error: e1 } = await supabase.from('restaurant_settings').select('id').limit(1);
  console.log('restaurant_settings error:', e1?.code === '42P01' ? 'TABLE MISSING' : e1);

  const { error: e2 } = await supabase.from('coupons').select('id').limit(1);
  console.log('coupons error:', e2?.code === '42P01' ? 'TABLE MISSING' : e2);
}
check();
