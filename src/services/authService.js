import { supabase } from '../lib/supabase';

export const authService = {
  // ─── EMAIL + PASSWORD AUTHENTICATION ─────────────────────────────────────
  async loginWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    const session = data.session;
    const authUser = data.user;

    const { data: userData, error: dbError } = await supabase.functions.invoke('auth-api', {
      body: { action: 'getUserData', payload: { authUserId: authUser.id } }
    });

    if (dbError || userData?.error || !userData?.success) {
      await supabase.auth.signOut();
      throw new Error(userData?.error || 'Failed to load user profile.');
    }

    const dbUser = userData.dbUser;
    const profile = userData.profile;
    const farmerProfile = userData.farmerProfile;

    // Use profile as the source of truth for status (profiles table is canonical)
    const userStatus = profile?.status || dbUser?.status;
    if (userStatus && userStatus !== 'active') {
      await supabase.auth.signOut();
      throw new Error(`Account status is ${userStatus}. Awaiting admin approval.`);
    }

    // Save token and user info to sessionStorage for compatibility with existing UI
    // Profile is the source of truth; dbUser provides business FK (app_user_id)
    sessionStorage.setItem('agro_token', session.access_token);
    sessionStorage.setItem('agro_user', JSON.stringify({
      id: dbUser?.id ?? null,          // Integer ID (legacy app_user_id) — may be null for pure auth users
      uuid: profile?.id || dbUser?.uuid, // UUID (profiles.id = auth.users.id)
      name: profile?.name || dbUser?.name,
      email: profile?.email || dbUser?.email,
      phone: profile?.phone || dbUser?.phone,
      role: profile?.role || dbUser?.role,
      status: profile?.status || dbUser?.status || 'active',
      first_login: profile?.first_login ?? dbUser?.first_login ?? false
    }));

    return {
      token: session.access_token,
      user: dbUser,
      profile: farmerProfile || profile,
      requirePasswordChange: (profile?.first_login ?? dbUser?.first_login) === true
    };
  },

  async registerWithEmail(formData) {
    const { name, email, password, phone, address, acres_of_land, crop_address } = formData;
    
    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'farmer', name }
      }
    });

    if (authError) throw authError;

    const { data: dbResult, error: dbError } = await supabase.functions.invoke('auth-api', {
      body: {
        action: 'registerDatabaseUser',
        payload: {
          name, email, phone, authUserId: authUser.user.id, address, acres_of_land, crop_address
        }
      }
    });

    if (dbError || dbResult?.error || !dbResult?.success) {
      throw new Error(dbResult?.error || 'Database registration failed');
    }

    return { message: 'Registration submitted. Awaiting admin approval.' };
  },

  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    });
    if (error) throw error;
    return data;
  },

  // ─── COMPATIBILITY & LIFECYCLE METHODS ────────────────────────────────────
  async logout() {
    await supabase.auth.signOut();
    sessionStorage.removeItem('agro_token');
    sessionStorage.removeItem('agro_user');
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData } = await supabase.functions.invoke('auth-api', {
      body: { action: 'getUserData', payload: { authUserId: user.id } }
    });

    if (!userData?.success) return null;

    // Return the unified dbUser object (built from profiles as source of truth)
    return userData.dbUser || null;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async changePassword(phone, oldPassword, newPassword) {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (updateError) throw updateError;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.functions.invoke('auth-api', {
        body: { action: 'setFirstLoginFalse', payload: { authUserId: user.id } }
      });
    }

    return { message: 'Password changed successfully' };
  },

  async updateProfile(userId, name, email) {
    const { data: result, error } = await supabase.functions.invoke('auth-api', {
      body: { action: 'updateProfile', payload: { userId, name, email } }
    });
      
    if (error || result?.error || result?.success === false) throw error || new Error(result?.error || 'Profile update failed');
    
    await supabase.auth.updateUser({
      data: { name }
    });

    const userStr = sessionStorage.getItem('agro_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      user.name = name;
      user.email = email;
      sessionStorage.setItem('agro_user', JSON.stringify(user));
    }

    return { message: 'Profile updated successfully' };
  },

  // ─── FUTURE COMPATIBILITY PLACEHOLDERS (MOBILE + OTP) ───────────────────────
  async loginWithPhone(phone) {
    console.log('loginWithPhone is not supported in development mode.');
    throw new Error('Phone login is only supported in production.');
  },

  async verifyOtp(phone, otp) {
    console.log('verifyOtp is not supported in development mode.');
    throw new Error('OTP verification is only supported in production.');
  }
};

export default authService;
