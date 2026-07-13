import { supabase } from '../lib/supabase';

const invoke = async (action, payload) => {
  // Include caller role so the edge function can validate permissions.
  // supabase.functions.invoke() sends the anon key as Authorization,
  // NOT the user's JWT, so the edge function cannot decode the user.
  const stored = sessionStorage.getItem('agro_user');
  const callerRole = stored ? JSON.parse(stored)?.role : null;

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, payload: { ...payload, callerRole } }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export const adminService = {
  async getDashboard() {
    return await invoke('getDashboard', {});
  },

  async getFarmers(status, search) {
    return await invoke('getFarmers', { status, search });
  },

  async createFarmer(farmerData) {
    const session = (await supabase.auth.getSession()).data?.session;
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        ...farmerData,
        role: 'farmer'
      },
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      }
    });

    if (error || data?.error) throw new Error(error?.message || data?.error || 'Failed to create farmer');
    return data;
  },

  async getFarmerDetails(farmerId) {
    return await invoke('getFarmerDetails', { farmerId });
  },

  async deleteFarmer(farmerId, adminId, adminName) {
    return await invoke('deleteFarmer', { farmerId, adminId, adminName });
  },

  async getManagers() {
    return await invoke('getManagers', {});
  },

  async createManager(managerData) {
    const session = (await supabase.auth.getSession()).data?.session;
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        ...managerData,
        role: 'manager'
      },
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      }
    });

    if (error || data?.error) throw new Error(error?.message || data?.error || 'Failed to create manager');
    return data;
  },

  async updateManagerStatus(managerId, status, adminId) {
    return await invoke('updateManagerStatus', { managerId, status, adminId });
  },

  async updateManager(managerId, managerData, adminId) {
    return await invoke('updateManager', { managerId, managerData, adminId });
  },

  async resetManagerPassword(managerId, newPassword) {
    const session = (await supabase.auth.getSession()).data?.session;
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { action: 'resetPassword', managerId, newPassword },
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    if (error || data?.error) throw new Error(error?.message || data?.error || 'Failed to reset password');
    return data;
  },

  async getAuditLogs() {
    return await invoke('getAuditLogs', {});
  },

  async getReportsMonthly(month) {
    return await invoke('getReportsMonthly', { month });
  },

  async getSeeds() {
    return await invoke('getSeeds', {});
  },

  async getWarehouses() {
    return await invoke('getWarehouses', {});
  },

  async createSeed(seedData) {
    return await invoke('createSeed', seedData);
  },

  async updateSeed(seedId, seedData) {
    return await invoke('updateSeed', { seedId, ...seedData });
  },

  async deleteSeed(seedId) {
    return await invoke('deleteSeed', { seedId });
  },

  async getSeedPurchases() {
    return await invoke('getSeedPurchases', {});
  },

  async updateSeedPurchaseStatus(purchaseId, status, adminId) {
    return await invoke('updateSeedPurchaseStatus', { purchaseId, status, adminId });
  }
};

export default adminService;
