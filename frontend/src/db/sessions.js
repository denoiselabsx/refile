import { supabase } from './index.js';

// Sessions table operations
export const sessionsDb = {
  // Create a new session
  async create(sessionData) {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        session_id: sessionData.session_id,
        user_id: sessionData.user_id,
        expires_at: sessionData.expires_at
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Find session by ID
  async findById(sessionId) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Find session with user data
  async findWithUser(sessionId) {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        users (*)
      `)
      .eq('session_id', sessionId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Delete session
  async delete(sessionId) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return true;
  },

  // Delete expired sessions
  async deleteExpired() {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) throw error;
    return true;
  },

  // Delete all sessions for a user
  async deleteByUserId(userId) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  }
};