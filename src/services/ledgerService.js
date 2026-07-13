import { supabase } from '../lib/supabase';

export const ledgerService = {
  async getTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, farmer:users(name, phone)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(t => ({
      ...t,
      farmer_name: t.farmer?.name,
      phone: t.farmer?.phone
    }));
  },

  async createTransaction(txData, adminId) {
    const { farmer_id, farmer_name, amount, direction, status, description } = txData;
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        farmer_id: farmer_id || null,
        amount: parseFloat(amount),
        direction,
        status: status || 'pending',
        description: description || farmer_name || null,
        reference_type: 'other'
      })
      .select('id')
      .single();

    if (error) throw error;

    // Log Audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: adminId,
        action: 'Add Manual Transaction',
        entity_type: 'transaction',
        entity_id: data.id,
        details: `Manual ${direction} of ₹${amount} for ${farmer_name || farmer_id}`
      });

    return { id: data.id, message: 'Transaction added' };
  },

  async updateTransaction(txId, txData, adminId) {
    const { farmer_id, amount, direction, status, description, created_at } = txData;
    const { error } = await supabase
      .from('transactions')
      .update({
        farmer_id: farmer_id || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        direction: direction || undefined,
        status: status || undefined,
        description: description ?? undefined,
        created_at: created_at || undefined
      })
      .eq('id', txId);

    if (error) throw error;

    // Log Audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: adminId,
        action: 'Edit Transaction',
        entity_type: 'transaction',
        entity_id: txId,
        details: `Edited transaction ${txId}`
      });

    return { message: 'Transaction updated' };
  },

  async processPayment(txId, adminId) {
    const { error } = await supabase.rpc('process_payment', {
      p_transaction_id: txId,
      p_admin_id: adminId
    });
    if (error) throw error;
    return { message: 'Transaction paid successfully' };
  }
};

export default ledgerService;
