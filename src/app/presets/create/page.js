"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import {
  PresetForm,
  EMPTY_PRESET,
  toFormData,
} from "@/components/preset-form";
import { useAuth } from "@/contexts/auth-context";
import { api } from "../../../../convex/_generated/api";

export default function CreatePresetPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const createPreset = useMutation(api.presets.create);
  const [initial, setInitial] = useState(EMPTY_PRESET);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login/google");
    }
  }, [isAuthenticated, isLoading, router]);

  // Pre-fill from a saved chat response (e.g. "Save as preset" on an AI reply)
  useEffect(() => {
    const draftRaw = sessionStorage.getItem("preset_draft");
    if (!draftRaw) return;
    try {
      const draft = JSON.parse(draftRaw);
      setInitial(
        toFormData({
          commandTemplate: draft.command_template || "",
          description: draft.description || "",
          tool: draft.tool || "",
          inputFilePatterns: (draft.input_files || []).map((f, idx) => ({
            name: idx === 0 ? "input_file" : `input_file_${idx + 1}`,
            extensions: [],
            description: `Input: ${typeof f === "string" ? f : f?.original_filename || ""}`,
          })),
          outputFilePatterns: (draft.output_files || []).map((f, idx) => ({
            name: idx === 0 ? "output_file" : `output_file_${idx + 1}`,
            template:
              typeof f === "string"
                ? f
                : f?.original_filename || f?.stored_filename || "",
            description: `Output: ${typeof f === "string" ? f : f?.original_filename || ""}`,
          })),
          isPublic: true,
        })
      );
      sessionStorage.removeItem("preset_draft");
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (args) => {
    setSubmitting(true);
    try {
      const presetId = await createPreset(args);
      toast.success("Preset published");
      router.push(`/presets/${presetId}`);
    } catch (err) {
      toast.error("Couldn't create preset", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-10">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/presets">
            <ArrowLeft className="size-3.5" /> Presets
          </Link>
        </Button>

        <div className="mt-5">
          <h1 className="text-h1 tracking-tight">New preset</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Share a reusable file recipe with the community.
          </p>
        </div>

        <div className="mt-8">
          <PresetForm
            key={initial.name + initial.command_template}
            initial={initial}
            submitLabel="Publish preset"
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </AppShell>
  );
}
