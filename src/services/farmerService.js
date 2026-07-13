import { supabase } from '../lib/supabase';

const invoke = async (action, payload) => {
  const { data, error } = await supabase.functions.invoke('farmer-api', {
    body: { action, payload }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export const farmerService = {
  async getProfile(userId) {
    return await invoke('getProfile', { userId });
  },

  async updateProfile(userId, profileData) {
    return await invoke('updateProfile', { userId, profileData });
  },

  async requestBankChange(bankForm) {
    return await invoke('requestBankChange', { bankForm });
  },

  async getDashboard(farmerId) {
    return await invoke('getDashboard', { farmerId });
  },

  async getCrops(farmerId) {
    return await invoke('getCrops', { farmerId });
  },

  async registerCrop(farmerId, cropData) {
    return await invoke('registerCrop', { farmerId, cropData });
  },

  async getSeeds() {
    return await invoke('getSeeds', {});
  },

  async purchaseSeeds(purchaseData) {
    return await invoke('purchaseSeeds', { purchaseData });
  },

  async getSeedPurchases(farmerId) {
    return await invoke('getSeedPurchases', { farmerId });
  },

  async submitGrainSale(farmerId, saleData) {
    return await invoke('submitGrainSale', { farmerId, saleData });
  },

  async getGrainSales(farmerId) {
    return await invoke('getGrainSales', { farmerId });
  },

  async getWarehouses() {
    return await invoke('getWarehouses', {});
  },

  async getWarehouseSlots(warehouseId, date) {
    return await invoke('getWarehouseSlots', { warehouseId, date });
  },

  async bookDeliverySlot(farmerId, bookingData) {
    return await invoke('bookDeliverySlot', { farmerId, bookingData });
  },

  async getBookingSlots(farmerId) {
    return await invoke('getBookingSlots', { farmerId });
  },

  async getTransactions(farmerId) {
    return await invoke('getTransactions', { farmerId });
  },

  async getVisits(farmerId) {
    return await invoke('getVisits', { farmerId });
  },

  async getNotifications(farmerId) {
    return await invoke('getNotifications', { farmerId });
  },

  async markNotificationsRead(farmerId) {
    return await invoke('markNotificationsRead', { farmerId });
  },

  async markNotificationRead(farmerId, notifId) {
    return await invoke('markNotificationRead', { farmerId, notifId });
  },

  async getMarketRates() {
    return await invoke('getMarketRates', {});
  }
};

export default farmerService;
