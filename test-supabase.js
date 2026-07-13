import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'farmer@test.com',
    password: 'password123'
  });
  
  if (authErr) {
    console.log('Auth failed, using user_id 1:', authErr.message);
  } else {
    console.log('Logged in as:', user?.id);
  }
  
  // Test get_farmer_dashboard
  const { data: dashboard, error: dashErr } = await supabase.rpc('get_farmer_dashboard', { p_farmer_id: 1 });
  console.log('Dashboard:', dashboard ? Object.keys(dashboard) : dashErr);
  
  // Test getTransactions
  const { data: tx, error: txErr } = await supabase.functions.invoke('farmer-api', {
    body: { action: 'getTransactions', payload: { farmerId: 1 } }
  });
  console.log('Transactions:', tx, txErr);
}

test();
