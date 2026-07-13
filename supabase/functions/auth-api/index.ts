import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Helper: build a JSON Response */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');

    // Client-scoped Supabase (respects RLS, uses caller's JWT)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    // Admin-scoped Supabase (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { action, payload } = await req.json();

    // ─── GET USER DATA ────────────────────────────────────────────────────────
    // Flow: auth.users → profiles → users (business) → farmer_profiles
    // This is the PRIMARY authentication data loader.
    // profiles is the source of truth for role, status, and identity.
    if (action === 'getUserData') {
      const { authUserId } = payload;

      if (!authUserId) {
        return jsonResponse({ success: false, error: 'authUserId is required' }, 400);
      }

      console.log('getUserData: Looking up profile for auth user:', authUserId);

      // 1. Look up the profile by auth user UUID (profiles.id = auth.users.id)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (profileError) {
        console.error('getUserData: profiles query error:', profileError.message);
        throw profileError;
      }

      // 2. If no profile exists, auto-create one from auth.users metadata
      let resolvedProfile = profile;
      if (!resolvedProfile) {
        console.log('getUserData: No profile found — auto-creating for', authUserId);

        // Fetch the auth user to get metadata
        const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.admin.getUserById(authUserId);
        if (authErr || !authUser) {
          console.error('getUserData: Auth user not found:', authErr?.message);
          return jsonResponse({ success: false, error: 'Auth user not found' }, 404);
        }

        const meta = authUser.user_metadata || {};
        const authEmail = authUser.email || null;
        const authPhone = meta.phone || authUser.phone || '';

        // Try to find a matching legacy users row by email (NOT by uuid)
        // This is the key fix: email is a more reliable match than uuid during migration
        let appUserId: number | null = null;

        if (authEmail) {
          const { data: legacyByEmail } = await supabaseAdmin
            .from('users')
            .select('id, role, status')
            .eq('email', authEmail)
            .maybeSingle();

          if (legacyByEmail) {
            appUserId = legacyByEmail.id;
            console.log('getUserData: Found legacy user by email:', authEmail, '→ app_user_id:', appUserId);

            // Also update the legacy users.uuid so future lookups are faster
            await supabaseAdmin
              .from('users')
              .update({ uuid: authUserId })
              .eq('id', appUserId);
          }
        }

        // If email didn't match, try phone as a fallback
        if (!appUserId && authPhone) {
          const cleanPhone = authPhone.replace(/^\+91/, '');
          const { data: legacyByPhone } = await supabaseAdmin
            .from('users')
            .select('id, role, status')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (legacyByPhone) {
            appUserId = legacyByPhone.id;
            console.log('getUserData: Found legacy user by phone:', cleanPhone, '→ app_user_id:', appUserId);

            await supabaseAdmin
              .from('users')
              .update({ uuid: authUserId })
              .eq('id', appUserId);
          }
        }

        // Determine role and status from metadata or legacy user
        const role = meta.role || 'farmer';
        const status = meta.status || 'active';

        // Create the missing profile
        const { data: newProfile, error: insertErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUserId,
            auth_user_id: authUserId,
            app_user_id: appUserId,
            name: meta.name || authEmail?.split('@')[0] || 'User',
            email: authEmail,
            phone: authPhone,
            role,
            status,
            first_login: meta.first_login ?? false,
          }, { onConflict: 'id' })
          .select('*')
          .single();

        if (insertErr) {
          console.error('getUserData: auto-create profile failed:', insertErr.message);
          return jsonResponse({ success: false, error: 'Failed to create profile: ' + insertErr.message }, 500);
        }

        resolvedProfile = newProfile;
        console.log('getUserData: Auto-created profile with app_user_id:', appUserId);
      }

      // 3. Fetch legacy business data from users if app_user_id exists
      let dbUser = null;
      if (resolvedProfile.app_user_id) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', resolvedProfile.app_user_id)
          .maybeSingle();
        dbUser = userData;
      }

      // 4. Fetch farmer_profiles if the role is farmer
      let farmerProfile = null;
      if (resolvedProfile.role === 'farmer' && resolvedProfile.app_user_id) {
        const { data: fpData } = await supabaseAdmin
          .from('farmer_profiles')
          .select('*')
          .eq('user_id', resolvedProfile.app_user_id)
          .maybeSingle();
        farmerProfile = fpData;
      }

      // 5. Build a unified user object for the frontend
      //    - id = app_user_id (integer, for business table FK compatibility)
      //    - uuid = profiles.id = auth.users.id (for Supabase auth references)
      //    - role, status, first_login come from profiles (source of truth)
      const unifiedUser = {
        id: resolvedProfile.app_user_id,
        uuid: resolvedProfile.id,
        name: resolvedProfile.name,
        email: resolvedProfile.email,
        phone: resolvedProfile.phone,
        role: resolvedProfile.role,
        status: resolvedProfile.status,
        first_login: resolvedProfile.first_login ?? false,
        created_at: resolvedProfile.created_at,
        updated_at: resolvedProfile.updated_at,
      };

      console.log('getUserData: Success — role:', unifiedUser.role, 'status:', unifiedUser.status, 'app_user_id:', unifiedUser.id);

      return jsonResponse({
        success: true,
        dbUser: unifiedUser,
        profile: resolvedProfile,
        farmerProfile,
      });
    }

    // ─── REGISTER DATABASE USER ───────────────────────────────────────────────
    // Called after supabase.auth.signUp() — the DB trigger may have already
    // created users + profiles rows. We update the profile with correct details
    // and create the farmer_profiles row.
    if (action === 'registerDatabaseUser') {
      const { name, email, phone, authUserId, address, acres_of_land, crop_address } = payload;

      if (!authUserId) {
        return jsonResponse({ success: false, error: 'authUserId is required' }, 400);
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ success: false, error: 'A valid email address is required' }, 400);
      }

      console.log('registerDatabaseUser: Registering for auth user:', authUserId);

      // Uniqueness checks (excluding this same auth user's own placeholder row,
      // created by the auth.users trigger before this action runs).
      if (phone) {
        const { data: dupPhone } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('phone', phone)
          .neq('id', authUserId)
          .maybeSingle();
        if (dupPhone) {
          return jsonResponse({ success: false, error: 'Phone number already registered' }, 409);
        }
      }

      const { data: dupEmail } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .neq('id', authUserId)
        .maybeSingle();
      if (dupEmail) {
        return jsonResponse({ success: false, error: 'Email address already registered' }, 409);
      }

      // Check if the trigger has already created a profile
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (existingProfile) {
        console.log('registerDatabaseUser: Trigger-created profile found, updating with registration data');

        // Update the trigger-created profile with correct details
        await supabaseAdmin
          .from('profiles')
          .update({
            name,
            email,
            phone: phone || '',
            role: 'farmer',
            status: 'pending',
            address: address || null,
          })
          .eq('id', authUserId);

        // Sync to legacy users table if linked
        if (existingProfile.app_user_id) {
          await supabaseAdmin
            .from('users')
            .update({
              name,
              email,
              phone: phone || '',
              status: 'pending',
            })
            .eq('id', existingProfile.app_user_id);
        }

        // Create farmer_profiles row using app_user_id
        if (existingProfile.app_user_id) {
          await supabaseAdmin.from('farmer_profiles').upsert({
            user_id: existingProfile.app_user_id,
            address: address || null,
            acres_of_land: parseFloat(acres_of_land) || 0,
            crop_address: crop_address || null,
          }, { onConflict: 'user_id' });
        }
      } else {
        console.log('registerDatabaseUser: No trigger-created profile, creating manually');

        // Trigger hasn't fired yet — create users + profiles manually
        // First, try to find an existing legacy users row by email or phone
        let appUserId: number | null = null;

        if (email) {
          const { data: legacyByEmail } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          if (legacyByEmail) {
            appUserId = legacyByEmail.id;
          }
        }

        if (!appUserId && phone) {
          const { data: legacyByPhone } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();
          if (legacyByPhone) {
            appUserId = legacyByPhone.id;
          }
        }

        // If no existing users row found, create one
        if (!appUserId) {
          const { data: newUser, error: userErr } = await supabaseAdmin
            .from('users')
            .insert({
              name,
              email,
              phone: phone || '',
              password_hash: '',
              role: 'farmer',
              status: 'pending',
              first_login: false,
              uuid: authUserId,
            })
            .select('id')
            .single();
          if (userErr) {
            console.error('registerDatabaseUser: Failed to create users row:', userErr.message);
            throw userErr;
          }
          appUserId = newUser.id;
        } else {
          // Link existing users row to auth user
          await supabaseAdmin
            .from('users')
            .update({ uuid: authUserId })
            .eq('id', appUserId);
        }

        // Create profile
        const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
          id: authUserId,
          auth_user_id: authUserId,
          app_user_id: appUserId,
          name,
          email,
          phone: phone || '',
          role: 'farmer',
          status: 'pending',
          address: address || null,
          first_login: false,
        }, { onConflict: 'id' });

        if (profileErr) {
          console.error('registerDatabaseUser: Failed to create profile:', profileErr.message);
          throw profileErr;
        }

        // Create farmer_profiles
        if (appUserId) {
          await supabaseAdmin.from('farmer_profiles').upsert({
            user_id: appUserId,
            address: address || null,
            acres_of_land: parseFloat(acres_of_land) || 0,
            crop_address: crop_address || null,
          }, { onConflict: 'user_id' });
        }
      }

      console.log('registerDatabaseUser: Success');
      return jsonResponse({ success: true, message: 'Database registration successful' });
    }

    // ─── SET FIRST LOGIN FALSE ────────────────────────────────────────────────
    // Updates profiles (source of truth) and syncs to legacy users
    if (action === 'setFirstLoginFalse') {
      const { authUserId } = payload;

      // Update profiles
      const { data: updatedProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ first_login: false, updated_at: new Date().toISOString() })
        .eq('id', authUserId)
        .select('app_user_id')
        .maybeSingle();

      if (profileErr) throw profileErr;

      // Sync to legacy users table
      if (updatedProfile?.app_user_id) {
        await supabaseAdmin
          .from('users')
          .update({ first_login: false, updated_at: new Date().toISOString() })
          .eq('id', updatedProfile.app_user_id);
      }

      return jsonResponse({ success: true, message: 'Updated' });
    }

    // ─── UPDATE PROFILE ───────────────────────────────────────────────────────
    // Updates profiles table (source of truth). Also syncs name/email to legacy users.
    if (action === 'updateProfile') {
      const { userId, name, email } = payload;

      // userId here is the app_user_id (integer) from the frontend
      // Update profiles by app_user_id
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ name, email, updated_at: new Date().toISOString() })
        .eq('app_user_id', userId);

      if (profileErr) throw profileErr;

      // Sync to legacy users table
      const { error: userErr } = await supabaseAdmin
        .from('users')
        .update({ name, email, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (userErr) throw userErr;

      return jsonResponse({ success: true, message: 'Updated' });
    }

    return jsonResponse({ error: 'Action not found' }, 404);

  } catch (err: any) {
    console.error('auth-api error:', err.message);
    return jsonResponse({ success: false, error: err.message }, 500);
  }
});
