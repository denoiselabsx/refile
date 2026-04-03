"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, X, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/auth-context";

export default function CreatePresetPage() {
  const { isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    command_template: "",
    input_file_patterns: [{ name: "input_file", extensions: [], description: "" }],
    output_file_patterns: [{ name: "output_file", template: "", description: "" }],
    tags: [],
    tool: "",
    is_public: true
  });
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login/google';
    }
  }, [isAuthenticated]);

  // Load draft data from sessionStorage if available
  useEffect(() => {
    const draftData = sessionStorage.getItem('preset_draft');
    if (draftData) {
      try {
        const draft = JSON.parse(draftData);
        setFormData(prev => ({
          ...prev,
          command_template: draft.command_template || '',
          description: draft.description || '',
          // Auto-populate input/output patterns from AI response if available
          input_file_patterns: draft.input_files && draft.input_files.length > 0
            ? draft.input_files.map(file => ({
                name: "input_file",
                extensions: [],
                description: `Input: ${file}`
              }))
            : prev.input_file_patterns,
          output_file_patterns: draft.output_files && draft.output_files.length > 0
            ? draft.output_files.map((file, idx) => ({
                name: `output_file_${idx + 1}`,
                template: typeof file === 'string' ? file : (file.original_filename || file.stored_filename || ''),
                description: `Output: ${typeof file === 'string' ? file : (file.original_filename || '')}`
              }))
            : prev.output_file_patterns
        }));
        // Clear the draft after loading
        sessionStorage.removeItem('preset_draft');
      } catch (e) {
        console.error('Failed to parse preset draft:', e);
      }
    }
  }, []);

  const categories = [
    { value: "image", label: "Image Processing" },
    { value: "video", label: "Video Processing" },
    { value: "audio", label: "Audio Processing" },
    { value: "pdf", label: "PDF Operations" },
    { value: "document", label: "Document Conversion" },
    { value: "archive", label: "Archive Operations" },
    { value: "other", label: "Other" }
  ];

  const tools = [
    { value: "imagemagick", label: "ImageMagick" },
    { value: "ffmpeg", label: "FFmpeg" },
    { value: "poppler", label: "Poppler" },
    { value: "pandoc", label: "Pandoc" },
    { value: "ghostscript", label: "Ghostscript" },
    { value: "custom", label: "Custom Tool" }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputPatternChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      input_file_patterns: prev.input_file_patterns.map((pattern, i) =>
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }));
  };

  const handleOutputPatternChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      output_file_patterns: prev.output_file_patterns.map((pattern, i) =>
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }));
  };

  const addInputPattern = () => {
    setFormData(prev => ({
      ...prev,
      input_file_patterns: [...prev.input_file_patterns, { name: "", extensions: [], description: "" }]
    }));
  };

  const removeInputPattern = (index) => {
    setFormData(prev => ({
      ...prev,
      input_file_patterns: prev.input_file_patterns.filter((_, i) => i !== index)
    }));
  };

  const addOutputPattern = () => {
    setFormData(prev => ({
      ...prev,
      output_file_patterns: [...prev.output_file_patterns, { name: "", template: "", description: "" }]
    }));
  };

  const removeOutputPattern = (index) => {
    setFormData(prev => ({
      ...prev,
      output_file_patterns: prev.output_file_patterns.filter((_, i) => i !== index)
    }));
  };

  const handleExtensionAdd = (patternIndex, extension) => {
    if (!extension.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      input_file_patterns: prev.input_file_patterns.map((pattern, i) =>
        i === patternIndex 
          ? { ...pattern, extensions: [...pattern.extensions, extension.trim()] }
          : pattern
      )
    }));
  };

  const handleExtensionRemove = (patternIndex, extensionIndex) => {
    setFormData(prev => ({
      ...prev,
      input_file_patterns: prev.input_file_patterns.map((pattern, i) =>
        i === patternIndex 
          ? { ...pattern, extensions: pattern.extensions.filter((_, ei) => ei !== extensionIndex) }
          : pattern
      )
    }));
  };

  const handleTagAdd = () => {
    if (!tagInput.trim() || formData.tags.includes(tagInput.trim())) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tagInput.trim()]
    }));
    setTagInput("");
  };

  const handleTagRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create preset');
      }

      const result = await response.json();
      window.location.href = `/presets/${result.preset.id}`;
    } catch (error) {
      console.error('Error creating preset:', error);
      alert('Failed to create preset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="ml-16 transition-all duration-300">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Create New Preset</h1>
                <p className="text-muted-foreground">
                  Share your file conversion recipe with the community
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={previewMode ? "outline" : "default"}
                size="sm"
                onClick={() => setPreviewMode(false)}
              >
                Edit
              </Button>
              <Button
                variant={previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          {previewMode ? (
            /* Preview Mode */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {formData.category && (
                    <span>
                      {formData.category === 'image' ? '🖼️' : 
                       formData.category === 'video' ? '🎥' :
                       formData.category === 'audio' ? '🎵' :
                       formData.category === 'pdf' ? '📄' : '⚡'}
                    </span>
                  )}
                  {formData.name || "Untitled Preset"}
                </CardTitle>
                <p className="text-muted-foreground">
                  {formData.description || "No description provided"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold mb-2">Command Template</h4>
                  <code className="block p-3 bg-muted rounded text-sm">
                    {formData.command_template || "No command template"}
                  </code>
                </div>

                {formData.input_file_patterns.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Input Files</h4>
                    {formData.input_file_patterns.map((pattern, index) => (
                      <div key={index} className="p-3 bg-muted rounded mb-2">
                        <div className="font-medium">{pattern.name || `Input ${index + 1}`}</div>
                        <div className="text-sm text-muted-foreground">{pattern.description}</div>
                        {pattern.extensions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {pattern.extensions.map((ext, ei) => (
                              <Badge key={ei} variant="outline" className="text-xs">{ext}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Edit Mode */
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Preset Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Convert to Grayscale"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description *
                    </label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe what this preset does..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full p-2 border border-input rounded-md bg-background"
                        required
                      >
                        <option value="">Select category...</option>
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tool *
                      </label>
                      <select
                        value={formData.tool}
                        onChange={(e) => handleInputChange('tool', e.target.value)}
                        className="w-full p-2 border border-input rounded-md bg-background"
                        required
                      >
                        <option value="">Select tool...</option>
                        {tools.map((tool) => (
                          <option key={tool.value} value={tool.value}>
                            {tool.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tags
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add a tag..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                      />
                      <Button type="button" onClick={handleTagAdd}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => handleTagRemove(index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Command Template */}
              <Card>
                <CardHeader>
                  <CardTitle>Command Template</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Use variables like {'{input_file}'} and {'{output_file}'} that will be replaced with actual file paths
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.command_template}
                    onChange={(e) => handleInputChange('command_template', e.target.value)}
                    placeholder="e.g., convert {input_file} -colorspace Gray {output_file}"
                    rows={4}
                    required
                  />
                </CardContent>
              </Card>

              {/* Input File Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle>Input File Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.input_file_patterns.map((pattern, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Input Pattern {index + 1}</h4>
                        {formData.input_file_patterns.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInputPattern(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Variable Name
                          </label>
                          <Input
                            value={pattern.name}
                            onChange={(e) => handleInputPatternChange(index, 'name', e.target.value)}
                            placeholder="e.g., input_file"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Description
                          </label>
                          <Input
                            value={pattern.description}
                            onChange={(e) => handleInputPatternChange(index, 'description', e.target.value)}
                            placeholder="e.g., Image to convert"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Allowed Extensions
                        </label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="e.g., .jpg, .png"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleExtensionAdd(index, e.target.value);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                        {pattern.extensions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {pattern.extensions.map((ext, ei) => (
                              <Badge key={ei} variant="outline" className="gap-1">
                                {ext}
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() => handleExtensionRemove(index, ei)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addInputPattern}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Input Pattern
                  </Button>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Preset
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}