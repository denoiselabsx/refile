"use client";

import { useState } from "react";
import { Heart, Play, Eye, Calendar, User, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function PresetCard({ preset, onLike, onExecute, onView, isLiked = false, isOwner = false }) {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(preset.likes_count || 0);

  const handleLike = async () => {
    try {
      await onLike(preset.id);
      setLiked(!liked);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      image: "🖼️",
      video: "🎥",
      audio: "🎵",
      pdf: "📄",
      document: "📝",
      archive: "📦"
    };
    return icons[category] || "⚡";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 border-border/50">
      {/* Verified badge for verified presets */}
      {preset.is_verified && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="default" className="bg-blue-500 text-white">
            ✓ Verified
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {getCategoryIcon(preset.category)} {preset.name}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {preset.description}
            </CardDescription>
          </div>
        </div>

        {/* Creator info */}
        <div className="flex items-center gap-2 mt-3">
          <Avatar className="h-6 w-6">
            <AvatarImage src={preset.users?.picture} alt={preset.users?.name} />
            <AvatarFallback className="text-xs">
              {preset.users?.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {preset.users?.name || 'Unknown'}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(preset.created_at)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Tags */}
        {preset.tags && preset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {preset.tags.slice(0, 4).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {preset.tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{preset.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Tool info */}
        {preset.tool && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span className="capitalize">{preset.tool}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Heart className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Play className="h-4 w-4" />
            <span>{preset.usage_count || 0}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(preset)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            size="sm"
            onClick={() => onExecute(preset)}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Use Preset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className="px-2"
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}