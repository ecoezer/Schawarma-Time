import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://bhwzlbrwiayllslwsnra.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJod3psYnJ3aWF5bGxzbHdzbnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTMyMTgsImV4cCI6MjA5MTE2OTIxOH0.Yz3sawnpGz61bhrHWRdqZKEmJqGLYvuQ3rYeN_94mSM');
async function test() {
  const { data } = await supabase.from('restaurant_settings').select('*');
  console.log('restaurant_settings data:', JSON.stringify(data, null, 2));
}
test();
