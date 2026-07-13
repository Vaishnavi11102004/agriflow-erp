import { supabase } from '../lib/supabase';

export const cropService = {
  async getCrops(farmerId) {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async registerCrop(farmerId, cropData) {
    const { crop_type, acres, sowing_date, notes } = cropData;
    const { data, error } = await supabase
      .from('crops')
      .insert({
        farmer_id: farmerId,
        crop_type,
        acres: parseFloat(acres),
        sowing_date,
        notes: notes || null
      })
      .select('id')
      .single();

    if (error) throw error;

    const visitMonths = { Rice:[1,3], Wheat:[1,3], Maize:[1,2], Cotton:[1,4], Groundnut:[1,3], Sugarcane:[2,5], Turmeric:[2,6], Chili:[1,3] };
    const months = visitMonths[crop_type] || [1, 3];

    return { id: data.id, message: `Crop registered. Farm visits scheduled for months ${months.join(' and ')}.` };
  }
};

export default cropService;
