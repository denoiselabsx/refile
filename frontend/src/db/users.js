import { supabase } from './index.js';

// Users table operations
export const usersDb = {
  // Create a new user
  async create(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        google_id: userData.google_id,
        name: userData.name,
        email: userData.email,
        picture: userData.picture
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Find user by ID
  async findById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Find user by Google ID
  async findByGoogleId(googleId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Find user by email
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Update user
  async update(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};