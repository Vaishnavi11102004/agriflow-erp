import { supabase } from '../lib/supabase';

export const publicService = {
  async getStats() {
    const { data, error } = await supabase.rpc('get_public_stats');
    if (error) throw error;
    return data;
  },

  async getSeeds() {
    const { data, error } = await supabase
      .from('seeds')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data;
  }
};

export default publicService;
