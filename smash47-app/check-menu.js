import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://bhwzlbrwiayllslwsnra.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJod3psYnJ3aWF5bGxzbHdzbnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTMyMTgsImV4cCI6MjA5MTE2OTIxOH0.Yz3sawnpGz61bhrHWRdqZKEmJqGLYvuQ3rYeN_94mSM'
);
async function check() {
  const { data: cats } = await supabase.from('categories').select('id,name').order('position');
  const { data: prods } = await supabase.from('products').select('id,name,image_url').order('position').limit(5);
  console.log('Categories (' + (cats?.length||0) + '):', cats?.map(c=>c.name).join(', '));
  console.log('Products (' + (prods?.length||0) + '):');
  prods?.forEach(p => console.log('  -', p.name, '| Bild:', p.image_url ? '✅' : '❌ KEIN BILD'));
}
check();
