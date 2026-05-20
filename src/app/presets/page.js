"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { Search, Plus, SlidersHorizontal, Layers, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { OfficialRecipeCard } from "@/components/official-recipe-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../../convex/_generated/api";
import { PLATFORM_PRESETS } from "@/lib/platform-presets";
import { CONVERSIONS } from "@/lib/conversions";

/**
 * Build the unified "Official recipes" list from the two static
 * prompt sources: platform pills + /convert SEO pages. Shape matches
 * what OfficialRecipeCard expects.
 *
 * These are PROMPTS, not commands — the page header surfaces the
 * distinction so users know what they're picking between.
 */
const OFFICIAL_RECIPES = [
  ...PLATFORM_PRESETS.map((p) => ({
    id: p.id,
    label: `Convert for ${p.label}`,
    description: p.description,
    prompt: p.prompt,
    kind: "platform",
    category: p.accepts.includes("video")
      ? "video"
      : p.accepts.includes("image")
        ? "image"
        : p.accepts.includes("pdf")
          ? "pdf"
          : "other",
  })),
  ...CONVERSIONS.map((c) => ({
    id: c.slug,
    label: c.title.replace(" Online — Free", ""),
    description: c.intro,
    prompt: c.examplePrompt,
    slug: c.slug,
    kind: "conversion",
    category: c.category,
  })),
];

const SORT_OPTIONS = [
  { value: "_creationTime:desc", label: "Newest" },
  { value: "_creationTime:asc", label: "Oldest" },
  { value: "usage_count:desc", label: "Most used" },
  { value: "likes_count:desc", label: "Most liked" },
];

export default function PresetsListPage() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [tags, setTags] = useState([]);
  const [sort, setSort] = useState("_creationTime:desc");

  // Honor /presets?tag=foo deep links from preset detail pages.
  useEffect(() => {
    const tag = searchParams.get("tag");
    if (tag && !tags.includes(tag)) setTags([tag]);
    const cat = searchParams.get("category");
    if (cat) setCategory(cat);
    // Run once on mount based on URL; subsequent state-driven changes don't refire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 220);
    return () => clearTimeout(id);
  }, [search]);

  const [sortBy, sortOrder] = sort.split(":");

  const rawPresets = useQuery(api.presets.list, {
    search: debouncedSearch || undefined,
    category: category || undefined,
    tags: tags.length > 0 ? tags : undefined,
    sortBy: sortBy === "_creationTime" ? undefined : sortBy,
    sortOrder,
    limit: 40,
  });

  // Convex returns newest-first by default. For "Oldest" we reverse client-side
  // rather than changing the query, since the result set is small.
  const presets = useMemo(() => {
    if (!rawPresets) return rawPresets;
    if (sortBy === "_creationTime" && sortOrder === "asc") {
      return [...rawPresets].sort(
        (a, b) => a._creationTime - b._creationTime
      );
    }
    return rawPresets;
  }, [rawPresets, sortBy, sortOrder]);

  const categories = useQuery(api.presets.categories);
  const popularTags = useQuery(api.presets.popularTags, { limit: 10 });
  const toggleLike = useMutation(api.presets.toggleLike);

  const handleLike = async (id) => {
    if (!isAuthenticated) {
      toast.error("Sign in to like presets");
      return;
    }
    try {
      await toggleLike({ id });
    } catch (err) {
      toast.error("Couldn't update like", { description: err?.message });
    }
  };

  const toggleTag = (tag) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const clearAll = () => {
    setSearch("");
    setCategory(null);
    setTags([]);
    setSort("_creationTime:desc");
  };

  const hasFilters = Boolean(category || tags.length || debouncedSearch);
  const loading = presets === undefined;

  // Filter the official-recipe list against the same search/category
  // controls the community grid uses, so a "compress" query trims both
  // sections in sync. Tags don't apply to officials (they don't carry
  // a tags array — that's a community-preset concept).
  const officialMatches = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return OFFICIAL_RECIPES.filter((r) => {
      if (category && r.category !== category) return false;
      if (tags.length > 0) return false; // hide officials when tag-filtering
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.prompt.toLowerCase().includes(q)
      );
    });
  }, [debouncedSearch, category, tags]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Layers className="size-3.5" />
              Recipes
            </div>
            <h1 className="text-h1 tracking-tight">Presets</h1>
            <p className="mt-2 max-w-prose text-[14.5px] text-muted-foreground sm:text-[15px]">
              Two kinds of recipes here: <strong className="text-foreground">official prompts</strong> (we
              wrote the wording, the AI picks the tool) and{" "}
              <strong className="text-foreground">community presets</strong> (someone
              wrote the exact shell command, run deterministically).
            </p>
          </div>
          {isAuthenticated && (
            <Button asChild className="self-start sm:self-auto">
              <Link href="/presets/create">
                <Plus className="size-3.5" />
                New preset
              </Link>
            </Button>
          )}
        </div>

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
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Sort presets">
              <SlidersHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
              <SelectValue />
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

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Categories
          </span>
          {!categories
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

        {popularTags && popularTags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Tags
            </span>
            {popularTags.map((t) => {
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

        {/* ── Official prompt-based recipes ────────────────────
            Sourced from src/lib/platform-presets.js (WhatsApp,
            Instagram, …) and src/lib/conversions.js (the 20 SEO
            pages). Same search/category filter as the community
            grid below. Hidden when the user is tag-filtering, since
            officials don't have tags. */}
        {officialMatches.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Official prompts
              </h2>
              <span className="text-[11.5px] text-muted-foreground">
                {officialMatches.length} recipe{officialMatches.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {officialMatches.map((r) => (
                <OfficialRecipeCard key={r.id} recipe={r} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              Community presets
            </h2>
            {!loading && presets ? (
              <span className="text-[11.5px] text-muted-foreground">
                {presets.length} preset{presets.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
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
                    <Button variant="outline" onClick={clearAll}>
                      Clear filters
                    </Button>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((preset) => (
                <PresetCard
                  key={preset._id}
                  preset={preset}
                  onLike={handleLike}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
