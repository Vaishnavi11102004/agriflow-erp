import { supabase } from '../lib/supabase';

export const warehouseService = {
  async getWarehouses() {
    const { data: warehouses, error } = await supabase
      .from('warehouses')
      .select('*, warehouse_inventory(*)')
      .order('name');

    if (error) throw error;

    return warehouses.map(w => ({
      ...w,
      inventory: w.warehouse_inventory || []
    }));
  },

  async createWarehouse(whData) {
    const { name, address, total_capacity_kg } = whData;
    const { data, error } = await supabase
      .from('warehouses')
      .insert({
        name,
        address,
        total_capacity_kg: parseFloat(total_capacity_kg)
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id, message: 'Warehouse created' };
  },

  async addInventory(warehouseId, inventoryData) {
    const { grain_type, quantity_kg } = inventoryData;
    const { error } = await supabase.rpc('add_warehouse_inventory', {
      p_warehouse_id: warehouseId,
      p_grain_type: grain_type,
      p_qty: parseFloat(quantity_kg)
    });

    if (error) throw error;
    return { message: 'Inventory added' };
  },

  async getWarehouseSlots(warehouseId, date) {
    const { data, error } = await supabase
      .from('warehouse_slots')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('slot_date', date)
      .eq('status', 'active')
      .order('start_time');

    if (error) throw error;
    return data;
  },

  async getWarehouseSlotsList(warehouseId, date) {
    let query = supabase.from('warehouse_slots').select('*, warehouse:warehouses(name)');
    
    if (warehouseId) query = query.eq('warehouse_id', warehouseId);
    if (date) query = query.eq('slot_date', date);

    const { data, error } = await query.order('slot_date', { ascending: false }).order('start_time', { ascending: true });
    if (error) throw error;

    return data.map(ws => ({
      ...ws,
      warehouse_name: ws.warehouse?.name
    }));
  },

  async createSlot(slotData) {
    const { warehouse_id, slot_date, start_time, end_time, total_capacity_kg } = slotData;
    const { data, error } = await supabase
      .from('warehouse_slots')
      .insert({
        warehouse_id: parseInt(warehouse_id),
        slot_date,
        start_time,
        end_time,
        total_capacity_kg: parseFloat(total_capacity_kg)
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id, message: 'Slot created successfully' };
  },

  async updateSlot(slotId, slotData) {
    const { status, total_capacity_kg } = slotData;
    const { error } = await supabase
      .from('warehouse_slots')
      .update({
        status: status || undefined,
        total_capacity_kg: total_capacity_kg ? parseFloat(total_capacity_kg) : undefined
      })
      .eq('id', slotId);

    if (error) throw error;
    return { message: 'Slot updated' };
  }
};

export default warehouseService;
