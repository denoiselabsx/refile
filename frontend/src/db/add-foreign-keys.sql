-- Add foreign key constraints to existing tables

-- Add foreign key constraint from presets to users
ALTER TABLE presets 
ADD CONSTRAINT fk_presets_user_id 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Add foreign key constraint from preset_likes to users  
ALTER TABLE preset_likes 
ADD CONSTRAINT fk_preset_likes_user_id 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Add foreign key constraint from preset_likes to presets
ALTER TABLE preset_likes 
ADD CONSTRAINT fk_preset_likes_preset_id 
FOREIGN KEY (preset_id) REFERENCES presets(id) ON DELETE CASCADE;