import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate that the request client is authorized
  const clientSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user: authUserSession }, error: sessionError } = await clientSupabase.auth.getUser();
  if (sessionError || !authUserSession) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Check client role in public.profiles
  const { data: requester, error: requesterError } = await supabase
    .from('profiles')
    .select('role, name, app_user_id')
    .eq('id', authUserSession.id)
    .single();

  if (requesterError || !requester || !['manager', 'super_admin'].includes(requester.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient privileges' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();

    if (body.action === 'resetPassword') {
      if (requester.role !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: Only super admin can reset passwords' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { managerId, newPassword } = body;
      if (!managerId || !newPassword) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: targetProfile, error: targetErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('app_user_id', managerId)
        .eq('role', 'manager')
        .single();
      if (targetErr || !targetProfile) {
        return new Response(JSON.stringify({ error: 'Manager not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { error: pwErr } = await supabase.auth.admin.updateUserById(targetProfile.id, { password: newPassword });
      if (pwErr) throw pwErr;

      await supabase.from('audit_logs').insert({
        user_id: requester.app_user_id, action: 'Reset Manager Password', entity_type: 'manager', entity_id: managerId, details: `Password reset for manager #${managerId}`
      });
      return new Response(JSON.stringify({ message: 'Password reset successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { name, email, phone, password, role, address, acres_of_land, crop_address, department } = body;

    // Email is required — login is email+password only, so an account created
    // without one could never sign in.
    if (!name || !phone || !email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!['farmer', 'manager'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid user role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Double check manager creation restriction: only super_admin can create managers
    if (role === 'manager' && requester.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only super admin can create managers' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check duplicate phone/email in database profiles
    const { data: existingPhone } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingPhone) {
      return new Response(JSON.stringify({ error: 'Phone number already registered' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmail) {
      return new Response(JSON.stringify({ error: 'Email address already registered' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create user in Supabase Auth via Admin client
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      phone: '+91' + phone,
      email: email || undefined,
      password: password,
      phone_confirm: true,
      email_confirm: true,
      user_metadata: { 
        role, 
        name,
        address,
        status: 'active',
        first_login: role === 'manager'
      }
    });

    if (authError) {
      return new Response(JSON.stringify({ error: 'Auth creation failed: ' + authError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // hashSync (not hash/genSalt) — the async variant spawns a Web Worker, which the
    // Supabase Edge Runtime does not support and fails with "Worker is not defined".
    const passHash = bcrypt.hashSync(password);

    // The database trigger automatically creates rows in public.users and public.profiles.
    // Fetch the newly created profile's app_user_id (integer ID)
    const { data: createdProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('app_user_id')
      .eq('id', newAuthUser.user.id)
      .single();

    if (profileErr || !createdProfile) {
      // Rollback Auth user
      await supabase.auth.admin.deleteUser(newAuthUser.user.id);
      return new Response(JSON.stringify({ error: 'Database registration failed: Profile not found' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const appUserId = createdProfile.app_user_id;

    // Sync legacy users password_hash for legacy authentication fallback
    if (appUserId) {
      await supabase
        .from('users')
        .update({ password_hash: passHash })
        .eq('id', appUserId);
    }

    // Insert profile data depending on role
    if (role === 'farmer') {
      const { error: profileError } = await supabase
        .from('farmer_profiles')
        .insert({
          user_id: appUserId,
          address: address || null,
          acres_of_land: parseFloat(acres_of_land) || 0,
          crop_address: crop_address || null
        });

      if (profileError) {
        return new Response(JSON.stringify({ error: 'Farmer profile creation failed: ' + profileError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Log Audit
      await supabase
        .from('audit_logs')
        .insert({
          user_id: requester.app_user_id,
          action: 'Create Farmer',
          entity_type: 'farmer',
          entity_id: appUserId,
          details: `Admin registered farmer ${name} (${phone})`
        });

    } else if (role === 'manager') {
      const { error: profileError } = await supabase
        .from('admin_profiles')
        .insert({
          user_id: appUserId,
          department: department || 'Agriculture'
        });

      if (profileError) {
        return new Response(JSON.stringify({ error: 'Manager profile creation failed: ' + profileError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Log Audit
      await supabase
        .from('audit_logs')
        .insert({
          user_id: requester.app_user_id,
          action: 'Create Manager',
          entity_type: 'manager',
          entity_id: appUserId,
          details: `Created manager: ${name} (${phone}), dept: ${department || 'Agriculture'}`
        });
    }

    return new Response(JSON.stringify({ message: `${role === 'farmer' ? 'Farmer' : 'Manager'} created successfully`, id: appUserId }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
