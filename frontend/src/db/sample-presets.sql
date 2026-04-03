-- Sample presets for demonstration
-- Run this after setting up the main schema

-- Insert sample presets (assuming user_id 1 exists)
INSERT INTO presets (user_id, name, description, category, command_template, input_file_patterns, output_file_patterns, tags, tool, is_public, is_verified) VALUES
(1, 'Convert to Grayscale', 'Convert any image to grayscale using ImageMagick', 'image', 'convert {input_file} -colorspace Gray {output_file}', 
 '[{"name": "input_file", "extensions": [".jpg", ".png", ".gif", ".bmp"], "description": "Source image to convert"}]',
 '[{"name": "output_file", "template": "{input_basename}_grayscale{input_ext}", "description": "Grayscale version of the image"}]',
 ARRAY['grayscale', 'imagemagick', 'image-processing'], 'imagemagick', true, true),

(1, 'Resize Image to 800px Width', 'Resize images to a standard 800px width while maintaining aspect ratio', 'image', 'convert {input_file} -resize 800x {output_file}',
 '[{"name": "input_file", "extensions": [".jpg", ".png", ".gif"], "description": "Image to resize"}]',
 '[{"name": "output_file", "template": "{input_basename}_800w{input_ext}", "description": "Resized image"}]',
 ARRAY['resize', 'imagemagick', 'optimization'], 'imagemagick', true, true),

(1, 'Extract Audio from Video', 'Extract audio track from video files using FFmpeg', 'video', 'ffmpeg -i {input_file} -vn -acodec copy {output_file}',
 '[{"name": "input_file", "extensions": [".mp4", ".avi", ".mkv", ".mov"], "description": "Video file to extract audio from"}]',
 '[{"name": "output_file", "template": "{input_basename}.mp4", "description": "Extracted audio file"}]',
 ARRAY['audio-extraction', 'ffmpeg', 'video-processing'], 'ffmpeg', true, true),

(1, 'Compress Video for Web', 'Compress video files for web use with good quality/size balance', 'video', 'ffmpeg -i {input_file} -vcodec libx264 -crf 23 -preset medium {output_file}',
 '[{"name": "input_file", "extensions": [".mp4", ".avi", ".mov"], "description": "Video file to compress"}]',
 '[{"name": "output_file", "template": "{input_basename}_compressed.mp4", "description": "Compressed video file"}]',
 ARRAY['compression', 'ffmpeg', 'web-optimization'], 'ffmpeg', true, true),

(1, 'PDF to Images', 'Convert PDF pages to individual image files', 'pdf', 'pdftoppm -png {input_file} {output_prefix}',
 '[{"name": "input_file", "extensions": [".pdf"], "description": "PDF file to convert"}]',
 '[{"name": "output_prefix", "template": "{input_basename}_page", "description": "Prefix for output image files"}]',
 ARRAY['pdf-conversion', 'poppler', 'image-export'], 'poppler', true, true),

(1, 'Create Thumbnail Grid', 'Create a thumbnail grid from multiple images', 'image', 'montage {input_files} -geometry 200x200+5+5 {output_file}',
 '[{"name": "input_files", "extensions": [".jpg", ".png"], "description": "Multiple images to create grid from"}]',
 '[{"name": "output_file", "template": "thumbnail_grid.jpg", "description": "Combined thumbnail grid image"}]',
 ARRAY['montage', 'imagemagick', 'thumbnails'], 'imagemagick', true, false),

(1, 'Audio Format Conversion', 'Convert audio files between different formats', 'audio', 'ffmpeg -i {input_file} -acodec {codec} {output_file}',
 '[{"name": "input_file", "extensions": [".mp3", ".wav", ".flac", ".m4a"], "description": "Audio file to convert"}]',
 '[{"name": "output_file", "template": "{input_basename}.{output_format}", "description": "Converted audio file"}]',
 ARRAY['audio-conversion', 'ffmpeg', 'format-change'], 'ffmpeg', true, false),

(1, 'Markdown to PDF', 'Convert Markdown documents to PDF using Pandoc', 'document', 'pandoc {input_file} -o {output_file} --pdf-engine=xelatex',
 '[{"name": "input_file", "extensions": [".md", ".markdown"], "description": "Markdown file to convert"}]',
 '[{"name": "output_file", "template": "{input_basename}.pdf", "description": "Generated PDF document"}]',
 ARRAY['markdown', 'pandoc', 'pdf-generation'], 'pandoc', true, true);

-- Update usage counts for some presets
UPDATE presets SET usage_count = 45 WHERE name = 'Convert to Grayscale';
UPDATE presets SET usage_count = 32 WHERE name = 'Resize Image to 800px Width';
UPDATE presets SET usage_count = 28 WHERE name = 'Extract Audio from Video';
UPDATE presets SET usage_count = 19 WHERE name = 'Compress Video for Web';
UPDATE presets SET usage_count = 15 WHERE name = 'PDF to Images';

-- Update likes counts
UPDATE presets SET likes_count = 12 WHERE name = 'Convert to Grayscale';
UPDATE presets SET likes_count = 8 WHERE name = 'Extract Audio from Video';
UPDATE presets SET likes_count = 6 WHERE name = 'Resize Image to 800px Width';