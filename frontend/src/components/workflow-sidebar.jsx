"use client";

import { useState, useEffect } from 'react';
import { Search, Loader2, Package, Image, Video, Music, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Package },
  { id: 'image', name: 'Image', icon: Image },
  { id: 'video', name: 'Video', icon: Video },
  { id: 'audio', name: 'Audio', icon: Music },
  { id: 'pdf', name: 'PDF', icon: FileText },
];

// Hardcoded presets for the workflow builder
const HARDCODED_PRESETS = [
  // Image Presets
  {
    id: 'preset-image-resize',
    name: 'Resize Image',
    description: 'Resize images to specified dimensions while maintaining aspect ratio',
    category: 'image',
    tool: 'ImageMagick',
    command_template: 'convert {input_file} -resize {width}x{height} {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.jpg', '.png', '.jpeg'], description: 'Image to resize' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_resized{input_ext}', description: 'Resized image' }],
    likes_count: 45,
    usage_count: 234,
  },
  {
    id: 'preset-image-grayscale',
    name: 'Convert to Grayscale',
    description: 'Convert color images to grayscale',
    category: 'image',
    tool: 'ImageMagick',
    command_template: 'convert {input_file} -colorspace Gray {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.jpg', '.png', '.jpeg'], description: 'Image to convert' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_gray{input_ext}', description: 'Grayscale image' }],
    likes_count: 32,
    usage_count: 178,
  },
  {
    id: 'preset-image-compress',
    name: 'Compress Image',
    description: 'Reduce image file size while maintaining visual quality',
    category: 'image',
    tool: 'ImageMagick',
    command_template: 'convert {input_file} -quality 85 {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.jpg', '.png', '.jpeg'], description: 'Image to compress' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_compressed{input_ext}', description: 'Compressed image' }],
    likes_count: 67,
    usage_count: 412,
  },
  {
    id: 'preset-image-watermark',
    name: 'Add Watermark',
    description: 'Add a watermark or logo to images',
    category: 'image',
    tool: 'ImageMagick',
    command_template: 'convert {input_file} {watermark} -gravity southeast -composite {output_file}',
    input_file_patterns: [
      { name: 'input_file', extensions: ['.jpg', '.png', '.jpeg'], description: 'Base image' },
      { name: 'watermark', extensions: ['.png'], description: 'Watermark image' }
    ],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_watermarked{input_ext}', description: 'Watermarked image' }],
    likes_count: 89,
    usage_count: 523,
  },

  // Video Presets
  {
    id: 'preset-video-extract-audio',
    name: 'Extract Audio from Video',
    description: 'Extract audio track from video files as MP3',
    category: 'video',
    tool: 'FFmpeg',
    command_template: 'ffmpeg -i {input_file} -vn -acodec libmp3lame {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.mp4', '.avi', '.mov', '.mkv'], description: 'Video file' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_audio.mp3', description: 'Extracted audio' }],
    likes_count: 112,
    usage_count: 687,
  },
  {
    id: 'preset-video-compress',
    name: 'Compress Video',
    description: 'Reduce video file size using H.265 codec',
    category: 'video',
    tool: 'FFmpeg',
    command_template: 'ffmpeg -i {input_file} -vcodec libx265 -crf 28 {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.mp4', '.avi', '.mov'], description: 'Video to compress' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_compressed.mp4', description: 'Compressed video' }],
    likes_count: 156,
    usage_count: 934,
  },
  {
    id: 'preset-video-thumbnail',
    name: 'Extract Video Thumbnail',
    description: 'Extract a frame from video as thumbnail image',
    category: 'video',
    tool: 'FFmpeg',
    command_template: 'ffmpeg -i {input_file} -ss 00:00:10 -vframes 1 {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.mp4', '.avi', '.mov', '.mkv'], description: 'Video file' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_thumbnail.jpg', description: 'Thumbnail image' }],
    likes_count: 78,
    usage_count: 456,
  },
  {
    id: 'preset-video-trim',
    name: 'Trim Video',
    description: 'Cut video from start time to end time',
    category: 'video',
    tool: 'FFmpeg',
    command_template: 'ffmpeg -i {input_file} -ss {start_time} -to {end_time} -c copy {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.mp4', '.avi', '.mov'], description: 'Video to trim' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_trimmed.mp4', description: 'Trimmed video' }],
    likes_count: 94,
    usage_count: 612,
  },

  // Audio Presets
  {
    id: 'preset-audio-convert',
    name: 'Convert Audio Format',
    description: 'Convert audio files to different formats',
    category: 'audio',
    tool: 'FFmpeg',
    command_template: 'ffmpeg -i {input_file} -acodec libmp3lame {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.wav', '.flac', '.m4a', '.ogg'], description: 'Audio file' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}.mp3', description: 'Converted audio' }],
    likes_count: 56,
    usage_count: 389,
  },
  {
    id: 'preset-audio-normalize',
    name: 'Normalize Audio Volume',
    description: 'Normalize audio levels for consistent volume',
    category: 'audio',
    tool: 'FFmpeg',
    command_template: 'ffmpeg -i {input_file} -af loudnorm {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.mp3', '.wav', '.flac'], description: 'Audio file' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_normalized{input_ext}', description: 'Normalized audio' }],
    likes_count: 43,
    usage_count: 267,
  },
  {
    id: 'preset-audio-trim',
    name: 'Trim Audio',
    description: 'Cut audio from start to end time',
    category: 'audio',
    tool: 'FFmpeg',
    command_template: 'ffmpeg -i {input_file} -ss {start_time} -t {duration} -acodec copy {output_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.mp3', '.wav', '.flac'], description: 'Audio to trim' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_trimmed{input_ext}', description: 'Trimmed audio' }],
    likes_count: 38,
    usage_count: 201,
  },

  // PDF Presets
  {
    id: 'preset-pdf-merge',
    name: 'Merge PDFs',
    description: 'Combine multiple PDF files into one',
    category: 'pdf',
    tool: 'PDFtk',
    command_template: 'pdfunite {input_file1} {input_file2} {output_file}',
    input_file_patterns: [
      { name: 'input_file1', extensions: ['.pdf'], description: 'First PDF' },
      { name: 'input_file2', extensions: ['.pdf'], description: 'Second PDF' }
    ],
    output_file_patterns: [{ name: 'output_file', template: 'merged_{timestamp}.pdf', description: 'Merged PDF' }],
    likes_count: 101,
    usage_count: 789,
  },
  {
    id: 'preset-pdf-compress',
    name: 'Compress PDF',
    description: 'Reduce PDF file size',
    category: 'pdf',
    tool: 'Ghostscript',
    command_template: 'gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile={output_file} {input_file}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.pdf'], description: 'PDF to compress' }],
    output_file_patterns: [{ name: 'output_file', template: '{input_basename}_compressed.pdf', description: 'Compressed PDF' }],
    likes_count: 87,
    usage_count: 654,
  },
  {
    id: 'preset-pdf-to-images',
    name: 'PDF to Images',
    description: 'Convert PDF pages to JPEG images',
    category: 'pdf',
    tool: 'Poppler',
    command_template: 'pdftocairo -jpeg -r 300 {input_file} {output_prefix}',
    input_file_patterns: [{ name: 'input_file', extensions: ['.pdf'], description: 'PDF file' }],
    output_file_patterns: [{ name: 'output_prefix', template: '{input_basename}_page', description: 'Image pages' }],
    likes_count: 72,
    usage_count: 487,
  },
];

export function WorkflowSidebar() {
  const [presets, setPresets] = useState(HARDCODED_PRESETS);
  const [filteredPresets, setFilteredPresets] = useState(HARDCODED_PRESETS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    filterPresets();
  }, [searchQuery, selectedCategory]);

  const filterPresets = () => {
    let filtered = HARDCODED_PRESETS;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPresets(filtered);
  };

  const onDragStart = (event, preset) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(preset));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-80 border-r flex flex-col h-full" style={{
      backgroundColor: 'var(--background)',
      borderColor: 'var(--border)',
    }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
          Preset Library
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-md border text-sm"
            style={{
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="p-4 border-b flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <Button
              key={category.id}
              size="sm"
              variant={isSelected ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="gap-2"
            >
              <Icon className="h-3 w-3" />
              {category.name}
            </Button>
          );
        })}
      </div>

      {/* Presets List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--muted-foreground)' }} />
          </div>
        ) : filteredPresets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              No presets found
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                draggable
                onDragStart={(e) => onDragStart(e, preset)}
                className="p-3 rounded-lg border cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {preset.category === 'image' && <Image className="h-4 w-4 text-blue-500" />}
                    {preset.category === 'video' && <Video className="h-4 w-4 text-purple-500" />}
                    {preset.category === 'audio' && <Music className="h-4 w-4 text-green-500" />}
                    {preset.category === 'pdf' && <FileText className="h-4 w-4 text-amber-500" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {preset.name}
                    </h3>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                      {preset.description}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      <span>❤️ {preset.likes_count || 0}</span>
                      <span>🔧 {preset.usage_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-4 border-t text-xs" style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--muted)',
        color: 'var(--muted-foreground)',
      }}>
        💡 Drag presets onto the canvas to build your workflow
      </div>
    </div>
  );
}
