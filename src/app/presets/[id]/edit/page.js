"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PresetForm, toFormData } from "@/components/preset-form";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../../../../convex/_generated/api";

export default function EditPresetPage(props) {
  const router = useRouter();
  const params = use(props.params);
  const { isAuthenticated, isLoading } = useAuth();
  const preset = useQuery(api.presets.get, { id: params.id });
  const updatePreset = useMutation(api.presets.update);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && !isAuthenticated) {
    if (typeof window !== "undefined") router.replace("/login/google");
    return null;
  }

  if (preset === undefined) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-10">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-6 h-10 w-1/2" />
          <Skeleton className="mt-3 h-4 w-1/3" />
          <Skeleton className="mt-8 h-[480px] rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (preset === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-5">
          <EmptyState
            title="Preset not found"
            description="It may have been deleted, or never existed."
            action={
              <Button asChild>
                <Link href="/presets">Browse presets</Link>
              </Button>
            }
          />
        </div>
      </AppShell>
    );
  }

  if (!preset.isOwner) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-5">
          <EmptyState
            title="You can't edit this preset"
            description="Only the original author can change it. You can fork it from the detail page."
            action={
              <Button asChild>
                <Link href={`/presets/${preset._id}`}>View preset</Link>
              </Button>
            }
          />
        </div>
      </AppShell>
    );
  }

  const handleSubmit = async (args) => {
    setSubmitting(true);
    try {
      await updatePreset({ id: preset._id, ...args });
      toast.success("Preset updated");
      router.push(`/presets/${preset._id}`);
    } catch (err) {
      toast.error("Couldn't save", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-10">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/presets/${preset._id}`}>
            <ArrowLeft className="size-3.5" /> Back to preset
          </Link>
        </Button>

        <div className="mt-5">
          <h1 className="text-h1 tracking-tight">Edit preset</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Editing “{preset.name}”.
          </p>
        </div>

        <div className="mt-8">
          <PresetForm
            initial={toFormData(preset)}
            submitLabel="Save changes"
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </AppShell>
  );
}
