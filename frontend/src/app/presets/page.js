"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Plus, Grid3X3, List, SortAsc, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PresetCard } from "@/components/preset-card";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/auth-context";

export default function PresetsPage() {
  const { isAuthenticated, user } = useAuth();
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("grid");
  const [categories, setCategories] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch presets
  useEffect(() => {
    fetchPresets();
  }, [searchQuery, selectedCategory, selectedTool, selectedTags, sortBy, sortOrder, page]);

  // Fetch metadata on mount
  useEffect(() => {
    fetchCategories();
    fetchPopularTags();
  }, []);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(selectedTool && { tool: selectedTool }),
        ...(selectedTags.length > 0 && { tags: JSON.stringify(selectedTags) }),
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/presets?${params}`);
      const data = await response.json();

      if (page === 1) {
        setPresets(data.presets || []);
      } else {
        setPresets(prev => [...prev, ...(data.presets || [])]);
      }
      
      setHasMore(data.presets?.length === 20);
    } catch (error) {
      console.error('Error fetching presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/presets/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const response = await fetch('/api/presets/tags');
      const data = await response.json();
      setPopularTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleLike = async (presetId) => {
    if (!isAuthenticated) {
      window.location.href = '/login/google';
      return;
    }

    try {
      const response = await fetch(`/api/presets/${presetId}/like`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to toggle like');
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleExecute = (preset) => {
    // TODO: Implement preset execution logic
    console.log('Execute preset:', preset);
  };

  const handleView = (preset) => {
    window.location.href = `/presets/${preset.id}`;
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
    setPage(1);
  };

  const handleTagFilter = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTool(null);
    setSelectedTags([]);
    setSearchQuery("");
    setPage(1);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? <Sidebar /> : <Navbar />}
      
      <main className={`transition-all duration-300 ${isAuthenticated ? 'ml-16' : ''}`}>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Community Presets</h1>
                <p className="text-muted-foreground">
                  Discover and share powerful file conversion recipes
                </p>
              </div>
              {isAuthenticated && (
                <Button onClick={() => window.location.href = '/presets/create'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Preset
                </Button>
              )}
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search presets..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Bars */}
              <div className="flex flex-wrap gap-4">
                {/* Categories */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Categories:</span>
                  {categories.map((category) => (
                    <Badge
                      key={category.name}
                      variant={selectedCategory === category.name ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleCategoryFilter(category.name)}
                    >
                      {category.name} ({category.count})
                    </Badge>
                  ))}
                </div>

                {/* Popular Tags */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Tags:</span>
                  {popularTags.slice(0, 8).map((tag) => (
                    <Badge
                      key={tag.name}
                      variant={selectedTags.includes(tag.name) ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleTagFilter(tag.name)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(selectedCategory || selectedTags.length > 0 || searchQuery) && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <Button variant="outline" size="sm" onClick={toggleSort}>
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    {sortBy === 'created_at' ? 'Date' : 'Popularity'}
                  </Button>

                  {/* View Mode */}
                  <div className="flex rounded-md border">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Presets Grid */}
          {loading && page === 1 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className={`gap-6 ${
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'flex flex-col space-y-4'
              }`}>
                {presets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onLike={handleLike}
                    onExecute={handleExecute}
                    onView={handleView}
                    isLiked={preset.isLiked}
                    isOwner={user?.id === preset.user_id}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && !loading && (
                <div className="flex justify-center mt-8">
                  <Button onClick={loadMore} variant="outline">
                    Load More
                  </Button>
                </div>
              )}

              {/* Loading More */}
              {loading && page > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}

              {/* No Results */}
              {presets.length === 0 && !loading && (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <h3 className="text-lg font-semibold mb-2">No presets found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search terms or filters
                    </p>
                    {isAuthenticated && (
                      <Button onClick={() => window.location.href = '/presets/create'}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create the first preset
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}