import { supabase } from '../lib/supabase';

export const marketService = {
  async getRates() {
    const { data, error } = await supabase
      .from('market_rates')
      .select('*')
      .order('crop_type')
      .order('grade');
    if (error) throw error;
    return data;
  },

  async setRate(rateData, adminId) {
    const { crop_type, grade, price_per_kg, effective_date } = rateData;
    const { data, error } = await supabase
      .from('market_rates')
      .insert({
        crop_type,
        grade,
        price_per_kg: parseFloat(price_per_kg),
        effective_date: effective_date || new Date().toISOString().split('T')[0],
        set_by: adminId
      })
      .select('id')
      .single();

    if (error) throw error;

    // Log Audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: adminId,
        action: 'Set Market Rate',
        entity_type: 'market_rate',
        entity_id: data.id,
        details: `Set rate for ${crop_type} Grade ${grade}: ₹${price_per_kg}/kg`
      });

    return { id: data.id, message: 'Rate set' };
  },

  async updateRate(rateId, rateData) {
    const { price_per_kg, effective_date } = rateData;
    const { error } = await supabase
      .from('market_rates')
      .update({
        price_per_kg: price_per_kg !== undefined ? parseFloat(price_per_kg) : undefined,
        effective_date: effective_date || undefined
      })
      .eq('id', rateId);
    if (error) throw error;
    return { message: 'Rate updated' };
  },

  async deleteRate(rateId) {
    const { error } = await supabase
      .from('market_rates')
      .delete()
      .eq('id', rateId);
    if (error) throw error;
    return { message: 'Rate deleted' };
  }
};

export default marketService;
