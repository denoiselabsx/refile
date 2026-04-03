-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY NOT NULL,
    google_id TEXT NOT NULL,
    name VARCHAR NOT NULL,
    email TEXT NOT NULL,
    picture TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    expires_at TIMESTAMP NOT NULL
);

-- Table for storing community presets
CREATE TABLE IF NOT EXISTS presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(user_id),  -- Creator of the preset
    name VARCHAR(255) NOT NULL,  -- e.g., "Convert to Grayscale"
    description TEXT NOT NULL,  -- What the preset does
    category VARCHAR(100),  -- e.g., "image", "video", "audio", "pdf"
    
    -- Command template with variables
    command_template TEXT NOT NULL,  -- e.g., "convert {input_file} -colorspace Gray {output_file}"
    
    -- File specifications
    input_file_patterns JSONB NOT NULL,  -- e.g., [{"name": "input_file", "extensions": [".png", ".jpg"], "description": "Image to convert"}]
    output_file_patterns JSONB NOT NULL,  -- e.g., [{"name": "output_file", "template": "{input_basename}_grayscale{input_ext}", "description": "Grayscale image"}]
    
    -- Metadata
    tags TEXT[],  -- e.g., ["grayscale", "image-processing", "imagemagick"]
    tool VARCHAR(50),  -- e.g., "imagemagick", "ffmpeg", "poppler"
    
    -- Community features
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,  -- Admin verified
    usage_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for preset likes/favorites
CREATE TABLE IF NOT EXISTS preset_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preset_id UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(preset_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_category ON presets(category);
CREATE INDEX IF NOT EXISTS idx_presets_is_public ON presets(is_public);
CREATE INDEX IF NOT EXISTS idx_presets_tags ON presets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_preset_likes_preset_id ON preset_likes(preset_id);
CREATE INDEX IF NOT EXISTS idx_preset_likes_user_id ON preset_likes(user_id);