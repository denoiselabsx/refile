"use client";

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FileCode, Image, Video, Music, FileText, Wand2 } from 'lucide-react';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'image':
      return <Image className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'audio':
      return <Music className="h-4 w-4" />;
    case 'pdf':
      return <FileText className="h-4 w-4" />;
    default:
      return <FileCode className="h-4 w-4" />;
  }
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'image':
      return '#3b82f6'; // blue
    case 'video':
      return '#8b5cf6'; // purple
    case 'audio':
      return '#10b981'; // green
    case 'pdf':
      return '#f59e0b'; // amber
    default:
      return '#6b7280'; // gray
  }
};

export const PresetNode = memo(({ data, selected }) => {
  const categoryColor = getCategoryColor(data.category);

  return (
    <div
      className="preset-node rounded-lg border-2 shadow-lg transition-all"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: selected ? categoryColor : 'var(--border)',
        minWidth: '200px',
        maxWidth: '250px',
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: categoryColor,
          width: '12px',
          height: '12px',
          border: '2px solid var(--background)',
        }}
      />

      {/* Node Header */}
      <div
        className="px-3 py-2 rounded-t-md flex items-center gap-2"
        style={{
          backgroundColor: categoryColor,
          opacity: 0.9,
        }}
      >
        <div style={{ color: 'white' }}>
          {getCategoryIcon(data.category)}
        </div>
        <span className="text-sm font-semibold text-white truncate">
          {data.label}
        </span>
      </div>

      {/* Node Body */}
      <div className="px-3 py-3">
        <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
          {data.description}
        </p>
        
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <Wand2 className="h-3 w-3" />
          <span>{data.tool}</span>
        </div>
      </div>

      {/* Node Footer - Stats */}
      {data.preset && (
        <div className="px-3 py-2 border-t flex items-center justify-between text-xs" style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--muted)',
          opacity: 0.5,
        }}>
          <span style={{ color: 'var(--muted-foreground)' }}>
            ❤️ {data.preset.likes_count || 0}
          </span>
          <span style={{ color: 'var(--muted-foreground)' }}>
            🔧 {data.preset.usage_count || 0}
          </span>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: categoryColor,
          width: '12px',
          height: '12px',
          border: '2px solid var(--background)',
        }}
      />
    </div>
  );
});

PresetNode.displayName = 'PresetNode';
