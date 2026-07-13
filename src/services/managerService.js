import { supabase } from '../lib/supabase';

const invoke = async (action, payload) => {
  const { data, error } = await supabase.functions.invoke('manager-api', {
    body: { action, payload }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export const managerService = {
  async approveFarmer(farmerId, status, notes, adminId) {
    return await invoke('approveFarmer', { farmerId, status, notes, adminId });
  },

  async getBankRequests() {
    return await invoke('getBankRequests', {});
  },

  async reviewBankRequest(requestId, status, notes, adminId) {
    return await invoke('reviewBankRequest', { requestId, status, notes, adminId });
  },

  async getVisits(adminId, role) {
    return await invoke('getVisits', { adminId, role });
  },

  async getActiveCrops() {
    return await invoke('getActiveCrops', {});
  },

  async scheduleVisit(visitData, adminId, adminRole) {
    return await invoke('scheduleVisit', { visitData, adminId, adminRole });
  },

  async updateVisit(visitId, visitData, adminId) {
    return await invoke('updateVisit', { visitId, visitData, adminId });
  },

  async triggerVisitNotifications(adminId) {
    return await invoke('triggerVisitNotifications', { adminId });
  },

  async getBookingSlots() {
    return await invoke('getBookingSlots', {});
  },

  async editYield(slotId, goodQty, badQty, adminName, adminId) {
    return await invoke('editYield', { slotId, goodQty, badQty, adminName, adminId });
  },

  async updateBookingStatus(slotId, status, warehouseSlotId, adminName, adminId) {
    return await invoke('updateBookingStatus', { slotId, status, warehouseSlotId, adminName, adminId });
  },

  async inspectCrop(slotId, goodQty, badQty, rejectionReason, notes, inspectorId, inspectorName) {
    return await invoke('inspectCrop', { slotId, goodQty, badQty, rejectionReason, notes, inspectorId, inspectorName });
  },

  async getGrainSales() {
    return await invoke('getGrainSales', {});
  },

  async procureCrop(procData, adminId) {
    return await invoke('procureCrop', { procData, adminId });
  },

  async reviewGrainSale(saleId, status, finalAmount, adminId) {
    return await invoke('reviewGrainSale', { saleId, status, finalAmount, adminId });
  },

  async payGrainSale(saleId, description, adminId) {
    return await invoke('payGrainSale', { saleId, description, adminId });
  }
};

export default managerService;
