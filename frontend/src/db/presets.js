import { supabase } from './index.js';

// Presets table operations
export const presetsDb = {
  // Create a new preset
  async create(presetData) {
    const { data, error } = await supabase
      .from('presets')
      .insert([{
        user_id: presetData.user_id,
        name: presetData.name,
        description: presetData.description,
        category: presetData.category,
        command_template: presetData.command_template,
        input_file_patterns: presetData.input_file_patterns,
        output_file_patterns: presetData.output_file_patterns,
        tags: presetData.tags,
        tool: presetData.tool,
        is_public: presetData.is_public ?? true
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all public presets with pagination and filtering
  async getPublic({ 
    page = 1, 
    limit = 20, 
    category = null, 
    tool = null, 
    tags = null, 
    search = null,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = {}) {
    let query = supabase
      .from('presets')
      .select(`
        *,
        users!inner(name, picture),
        preset_likes(id)
      `)
      .eq('is_public', true);

    // Apply filters
    if (category) query = query.eq('category', category);
    if (tool) query = query.eq('tool', tool);
    if (tags && tags.length > 0) query = query.contains('tags', tags);
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    
    if (error) throw error;
    return { presets: data, total: count };
  },

  // Get preset by ID with user info
  async getById(presetId, userId = null) {
    let query = supabase
      .from('presets')
      .select(`
        *,
        users!inner(name, picture)
      `)
      .eq('id', presetId)
      .single();

    const { data: preset, error } = await query;
    
    if (error) throw error;

    // Check if user has liked this preset
    let isLiked = false;
    if (userId) {
      const { data: like } = await supabase
        .from('preset_likes')
        .select('id')
        .eq('preset_id', presetId)
        .eq('user_id', userId)
        .single();
      
      isLiked = !!like;
    }

    return { ...preset, isLiked };
  },

  // Get user's presets
  async getByUserId(userId, includePrivate = true) {
    let query = supabase
      .from('presets')
      .select(`
        *,
        preset_likes(id)
      `)
      .eq('user_id', userId);

    if (!includePrivate) {
      query = query.eq('is_public', true);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  // Update preset
  async update(presetId, userId, updates) {
    const { data, error } = await supabase
      .from('presets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', presetId)
      .eq('user_id', userId) // Ensure user owns the preset
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete preset
  async delete(presetId, userId) {
    const { error } = await supabase
      .from('presets')
      .delete()
      .eq('id', presetId)
      .eq('user_id', userId); // Ensure user owns the preset
    
    if (error) throw error;
    return true;
  },

  // Increment usage count
  async incrementUsage(presetId) {
    const { error } = await supabase.rpc('increment_preset_usage', {
      preset_id: presetId
    });
    
    if (error) {
      // Fallback if RPC doesn't exist
      const { data: preset } = await supabase
        .from('presets')
        .select('usage_count')
        .eq('id', presetId)
        .single();
      
      if (preset) {
        await supabase
          .from('presets')
          .update({ usage_count: preset.usage_count + 1 })
          .eq('id', presetId);
      }
    }
  },

  // Get categories with counts
  async getCategories() {
    const { data, error } = await supabase
      .from('presets')
      .select('category')
      .eq('is_public', true);
    
    if (error) throw error;
    
    const categoryCounts = data.reduce((acc, item) => {
      if (item.category) {
        acc[item.category] = (acc[item.category] || 0) + 1;
      }
      return acc;
    }, {});
    
    return Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));
  },

  // Get popular tags
  async getPopularTags(limit = 20) {
    const { data, error } = await supabase
      .from('presets')
      .select('tags')
      .eq('is_public', true);
    
    if (error) throw error;
    
    const tagCounts = {};
    data.forEach(preset => {
      if (preset.tags) {
        preset.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }
};

// Preset likes operations
export const presetLikesDb = {
  // Toggle like for a preset
  async toggle(presetId, userId) {
    // Check if like exists
    const { data: existingLike, error: checkError } = await supabase
      .from('preset_likes')
      .select('id')
      .eq('preset_id', presetId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existingLike) {
      // Remove like
      const { error } = await supabase
        .from('preset_likes')
        .delete()
        .eq('preset_id', presetId)
        .eq('user_id', userId);
      
      if (error) throw error;

      // Decrement likes count
      await supabase.rpc('decrement_preset_likes', { preset_id: presetId });
      
      return { liked: false };
    } else {
      // Add like
      const { error } = await supabase
        .from('preset_likes')
        .insert([{
          preset_id: presetId,
          user_id: userId
        }]);
      
      if (error) throw error;

      // Increment likes count
      await supabase.rpc('increment_preset_likes', { preset_id: presetId });
      
      return { liked: true };
    }
  },

  // Get user's liked presets
  async getUserLikes(userId, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('preset_likes')
      .select(`
        presets!inner(
          *,
          users!inner(name, picture)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return data.map(item => item.presets);
  }
};