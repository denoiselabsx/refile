"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, Heart, Play, Share2, Edit, Trash2, Flag, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/auth-context";

export default function PresetDetailPage(props) {
  const params = use(props.params);
  const { isAuthenticated, user } = useAuth();
  const [preset, setPreset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPreset();
  }, [params.id]);

  const fetchPreset = async () => {
    try {
      const response = await fetch(`/api/presets/${params.id}`);
      if (!response.ok) throw new Error('Preset not found');
      
      const data = await response.json();
      setPreset(data.preset);
      setLiked(data.preset.isLiked || false);
      setLikeCount(data.preset.likes_count || 0);
    } catch (error) {
      console.error('Error fetching preset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login/google';
      return;
    }

    try {
      const response = await fetch(`/api/presets/${params.id}/like`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleExecute = () => {
    // TODO: Implement preset execution
    console.log('Execute preset:', preset);
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(preset.command_template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    window.location.href = `/presets/${params.id}/edit`;
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this preset?')) return;

    try {
      const response = await fetch(`/api/presets/${params.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        window.location.href = '/presets';
      }
    } catch (error) {
      console.error('Error deleting preset:', error);
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {isAuthenticated ? <Sidebar /> : <Navbar />}
        <main className={`transition-all duration-300 ${isAuthenticated ? 'ml-16' : ''}`}>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="min-h-screen bg-background">
        {isAuthenticated ? <Sidebar /> : <Navbar />}
        <main className={`transition-all duration-300 ${isAuthenticated ? 'ml-16' : ''}`}>
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardContent className="text-center py-12">
                <h2 className="text-2xl font-bold mb-2">Preset Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  The preset you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => window.location.href = '/presets'}>
                  Browse Presets
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = user?.id === preset.user_id;

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? <Sidebar /> : <Navbar />}
      
      <main className={`transition-all duration-300 ${isAuthenticated ? 'ml-16' : ''}`}>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  {getCategoryIcon(preset.category)}
                  {preset.name}
                  {preset.is_verified && (
                    <Badge className="bg-blue-500 text-white">
                      ✓ Verified
                    </Badge>
                  )}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {preset.description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleExecute} size="lg">
                <Play className="h-4 w-4 mr-2" />
                Use This Preset
              </Button>
              
              <Button variant="outline" onClick={handleLike}>
                <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                {likeCount}
              </Button>

              <Button variant="outline" onClick={handleCopyCommand}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Command
                  </>
                )}
              </Button>

              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              {isOwner && (
                <>
                  <Button variant="outline" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}

              {!isOwner && (
                <Button variant="outline" className="text-red-600">
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Command Template */}
              <Card>
                <CardHeader>
                  <CardTitle>Command Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{preset.command_template}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={handleCopyCommand}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Input File Patterns */}
              {preset.input_file_patterns && preset.input_file_patterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Input File Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preset.input_file_patterns.map((pattern, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="font-semibold mb-2">
                          {pattern.name || `Input ${index + 1}`}
                        </div>
                        {pattern.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {pattern.description}
                          </p>
                        )}
                        {pattern.extensions && pattern.extensions.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">Supported formats:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {pattern.extensions.map((ext, ei) => (
                                <Badge key={ei} variant="outline" className="text-xs">
                                  {ext}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Output File Patterns */}
              {preset.output_file_patterns && preset.output_file_patterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Output Files</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preset.output_file_patterns.map((pattern, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="font-semibold mb-2">
                          {pattern.name || `Output ${index + 1}`}
                        </div>
                        {pattern.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {pattern.description}
                          </p>
                        )}
                        {pattern.template && (
                          <div>
                            <span className="text-sm font-medium">File naming template:</span>
                            <code className="block mt-1 p-2 bg-muted rounded text-xs">
                              {pattern.template}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Creator Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Created by</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={preset.users?.picture} alt={preset.users?.name} />
                      <AvatarFallback>
                        {preset.users?.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{preset.users?.name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(preset.created_at)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <Badge variant="secondary" className="capitalize">
                      {preset.category}
                    </Badge>
                  </div>
                  
                  {preset.tool && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tool</span>
                      <Badge variant="outline" className="capitalize">
                        {preset.tool}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used</span>
                    <span>{preset.usage_count || 0} times</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Likes</span>
                    <span>{likeCount}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visibility</span>
                    <Badge variant={preset.is_public ? "default" : "secondary"}>
                      {preset.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {preset.tags && preset.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {preset.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => window.location.href = `/presets?tag=${encodeURIComponent(tag)}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}