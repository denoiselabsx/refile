"use client";

// Metadata for this route is defined in presets/layout.js since page is "use client".
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PresetCard } from "@/components/preset-card";
import { useAuth } from "@/contexts/auth-context";

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest" },
  { value: "created_at:asc", label: "Oldest" },
  { value: "usage_count:desc", label: "Most used" },
  { value: "likes_count:desc", label: "Most liked" },
];

export default function PresetsListPage() {
  const { isAuthenticated } = useAuth();
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [tags, setTags] = useState([]);
  const [sort, setSort] = useState("created_at:desc");
  const [categories, setCategories] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 220);
    return () => clearTimeout(id);
  }, [search]);

  const [sortBy, sortOrder] = sort.split(":");

  const fetchPresets = useCallback(
    async (pageToFetch) => {
      const isFirstPage = pageToFetch === 1;
      isFirstPage ? setLoading(true) : setLoadingMore(true);
      try {
        const params = new URLSearchParams({
          page: String(pageToFetch),
          limit: "20",
          sortBy,
          sortOrder,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(category && { category }),
          ...(tags.length > 0 && { tags: JSON.stringify(tags) }),
        });
        const res = await fetch(`/api/presets?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json().catch(() => ({}));
        const items = Array.isArray(data.presets) ? data.presets : [];
        setPresets((prev) => (isFirstPage ? items : [...prev, ...items]));
        setHasMore(items.length === 20);
      } catch {
        // Fail-soft: leave whatever's already on screen, surface a small toast
        if (isFirstPage) {
          setPresets([]);
          setHasMore(false);
          toast.error("Presets are unavailable right now");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, category, tags, sortBy, sortOrder]
  );

  // First page / filter changes
  useEffect(() => {
    setPage(1);
    fetchPresets(1);
  }, [fetchPresets]);

  // Subsequent pages
  useEffect(() => {
    if (page > 1) fetchPresets(page);
  }, [page, fetchPresets]);

  useEffect(() => {
    (async () => {
      const safeJson = (url) =>
        fetch(url, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : {}))
          .catch(() => ({}));
      const [c, t] = await Promise.all([
        safeJson("/api/presets/categories"),
        safeJson("/api/presets/tags"),
      ]);
      setCategories(Array.isArray(c.categories) ? c.categories : []);
      setPopularTags(Array.isArray(t.tags) ? t.tags : []);
    })();
  }, []);

  const handleLike = async (id) => {
    if (!isAuthenticated) {
      toast.error("Sign in to like presets");
      window.location.href = "/login/google";
      return;
    }
    try {
      const res = await fetch(`/api/presets/${id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Couldn't update like");
    }
  };

  const toggleTag = (tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const clearAll = () => {
    setSearch("");
    setCategory(null);
    setTags([]);
    setSort("created_at:desc");
  };

  const hasFilters = Boolean(category || tags.length || debouncedSearch);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Layers className="size-3.5" />
              Community
            </div>
            <h1 className="text-h1 tracking-tight">Presets</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Reusable recipes for converting, extracting, and transforming files.
            </p>
          </div>
          {isAuthenticated && (
            <Button asChild>
              <Link href="/presets/create">
                <Plus className="size-3.5" />
                New preset
              </Link>
            </Button>
          )}
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search presets…"
              className="pl-9"
            />
          </div>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px]">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter rails */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Categories
          </span>
          {categories.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20" />
              ))
            : categories.map((c) => {
                const active = category === c.name;
                return (
                  <button
                    key={c.name}
                    onClick={() => setCategory(active ? null : c.name)}
                    className={`inline-flex h-6 items-center rounded-md border px-2 text-[11.5px] transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {c.name} <span className="ml-1 opacity-60">{c.count}</span>
                  </button>
                );
              })}
        </div>

        {popularTags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Tags
            </span>
            {popularTags.slice(0, 10).map((t) => {
              const active = tags.includes(t.name);
              return (
                <button
                  key={t.name}
                  onClick={() => toggleTag(t.name)}
                  className={`inline-flex h-6 items-center rounded-md border px-2 text-[11.5px] transition-colors ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        )}

        {hasFilters && (
          <div className="mt-4">
            <Button size="sm" variant="ghost" onClick={clearAll}>
              Clear filters
            </Button>
          </div>
        )}

        {/* Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] rounded-xl" />
              ))}
            </div>
          ) : presets.length === 0 ? (
            <div className="surface">
              <EmptyState
                icon={Sparkles}
                title="No presets match"
                description="Try changing your search or clearing filters."
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={clearAll}>Clear filters</Button>
                  ) : isAuthenticated ? (
                    <Button asChild>
                      <Link href="/presets/create">
                        <Plus className="size-3.5" /> Create the first one
                      </Link>
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {presets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onLike={handleLike}
                    isLiked={preset.isLiked}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    loading={loadingMore}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
