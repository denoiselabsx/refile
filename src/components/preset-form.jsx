"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Save,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "pdf", label: "PDF" },
  { value: "document", label: "Document" },
  { value: "archive", label: "Archive" },
  { value: "other", label: "Other" },
];

const TOOLS = [
  { value: "imagemagick", label: "ImageMagick" },
  { value: "ffmpeg", label: "FFmpeg" },
  { value: "poppler", label: "Poppler" },
  { value: "pandoc", label: "Pandoc" },
  { value: "ghostscript", label: "Ghostscript" },
  { value: "qpdf", label: "qpdf" },
  { value: "custom", label: "Custom" },
];

const STEPS = [
  { id: "basics", title: "Basics", description: "Name, category, and tool" },
  { id: "command", title: "Command", description: "The shell template" },
  { id: "io", title: "Inputs & outputs", description: "Variables and file patterns" },
  { id: "review", title: "Review", description: "Confirm and save" },
];

export const EMPTY_PRESET = {
  name: "",
  description: "",
  category: "",
  command_template: "",
  input_file_patterns: [{ name: "input_file", extensions: [], description: "" }],
  output_file_patterns: [{ name: "output_file", template: "", description: "" }],
  tags: [],
  tool: "",
  is_public: true,
};

// Convert Convex-format (camelCase) preset into the form's snake_case shape.
export function toFormData(preset) {
  if (!preset) return EMPTY_PRESET;
  return {
    name: preset.name || "",
    description: preset.description || "",
    category: preset.category || "",
    tool: preset.tool || "",
    command_template: preset.commandTemplate || "",
    input_file_patterns:
      (preset.inputFilePatterns || []).map((p) => ({
        name: p.name || "",
        extensions: p.extensions || [],
        description: p.description || "",
      })) || EMPTY_PRESET.input_file_patterns,
    output_file_patterns:
      (preset.outputFilePatterns || []).map((p) => ({
        name: p.name || "",
        template: p.template || "",
        description: p.description || "",
      })) || EMPTY_PRESET.output_file_patterns,
    tags: preset.tags || [],
    is_public: preset.isPublic ?? true,
  };
}

// Convert form snake_case shape into the Convex mutation args.
export function toMutationArgs(formData) {
  return {
    name: formData.name.trim(),
    description: formData.description.trim(),
    category: formData.category,
    tool: formData.tool,
    commandTemplate: formData.command_template.trim(),
    inputFilePatterns: formData.input_file_patterns
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        extensions: (p.extensions || []).filter(Boolean),
        description: p.description?.trim() || undefined,
      })),
    outputFilePatterns: formData.output_file_patterns
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        template: p.template?.trim() || undefined,
        description: p.description?.trim() || undefined,
      })),
    tags: formData.tags,
    isPublic: formData.is_public,
  };
}

export function PresetForm({
  initial = EMPTY_PRESET,
  submitLabel = "Save preset",
  onSubmit,
  submitting = false,
}) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(initial);
  const [tagInput, setTagInput] = useState("");
  const [extInputs, setExtInputs] = useState({});

  const set = (field) => (value) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const updatePattern = (key, index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].map((pattern, i) =>
        i === index ? { ...pattern, [field]: value } : pattern
      ),
    }));
  };

  const addPattern = (key) => {
    const empty =
      key === "input_file_patterns"
        ? { name: "", extensions: [], description: "" }
        : { name: "", template: "", description: "" };
    setFormData((p) => ({ ...p, [key]: [...p[key], empty] }));
  };

  const removePattern = (key, index) => {
    setFormData((p) => ({
      ...p,
      [key]: p[key].filter((_, i) => i !== index),
    }));
  };

  const addExtension = (index, value) => {
    if (!value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      input_file_patterns: prev.input_file_patterns.map((p, i) =>
        i === index
          ? { ...p, extensions: [...p.extensions, value.trim()] }
          : p
      ),
    }));
    setExtInputs((s) => ({ ...s, [index]: "" }));
  };

  const removeExtension = (pIdx, eIdx) => {
    setFormData((prev) => ({
      ...prev,
      input_file_patterns: prev.input_file_patterns.map((p, i) =>
        i === pIdx
          ? { ...p, extensions: p.extensions.filter((_, ei) => ei !== eIdx) }
          : p
      ),
    }));
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v || formData.tags.includes(v)) return;
    setFormData((p) => ({ ...p, tags: [...p.tags, v] }));
    setTagInput("");
  };

  const removeTag = (i) =>
    setFormData((p) => ({ ...p, tags: p.tags.filter((_, idx) => idx !== i) }));

  const validateStep = (idx) => {
    if (idx === 0) {
      if (!formData.name.trim()) return "Give your preset a name";
      if (!formData.description.trim()) return "Add a description";
      if (!formData.category) return "Pick a category";
      if (!formData.tool) return "Pick a tool";
    }
    if (idx === 1) {
      if (!formData.command_template.trim()) return "Write a command template";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      const err = validateStep(i);
      if (err) {
        toast.error(err);
        setStep(i);
        return;
      }
    }
    onSubmit?.(toMutationArgs(formData));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
      <Stepper currentStep={step} onJump={(i) => i <= step && setStep(i)} />

      <div className="surface min-h-[420px] p-5 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <BasicsStep
                formData={formData}
                set={set}
                tagInput={tagInput}
                setTagInput={setTagInput}
                onAddTag={addTag}
                onRemoveTag={removeTag}
              />
            )}
            {step === 1 && <CommandStep formData={formData} set={set} />}
            {step === 2 && (
              <IoStep
                formData={formData}
                updatePattern={updatePattern}
                addPattern={addPattern}
                removePattern={removePattern}
                extInputs={extInputs}
                setExtInputs={setExtInputs}
                addExtension={addExtension}
                removeExtension={removeExtension}
              />
            )}
            {step === 3 && <ReviewStep formData={formData} />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ArrowLeft className="size-3.5" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Continue <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting}>
              <Save className="size-3.5" /> {submitLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ currentStep, onJump }) {
  return (
    <>
      {/* Mobile stepper — compact pill row */}
      <ol className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {STEPS.map((s, i) => {
          const state =
            i < currentStep ? "done" : i === currentStep ? "current" : "upcoming";
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={state === "upcoming"}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  state === "current" &&
                    "border-foreground bg-foreground text-background",
                  state === "done" &&
                    "border-border bg-muted text-foreground",
                  state === "upcoming" &&
                    "border-border text-muted-foreground opacity-60"
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-4 items-center justify-center rounded-full text-[10px]",
                    state === "done"
                      ? "bg-background text-foreground"
                      : state === "current"
                        ? "bg-background/20 text-background"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {state === "done" ? <Check className="size-2.5" /> : i + 1}
                </span>
                {s.title}
              </button>
            </li>
          );
        })}
      </ol>

      <ol className="hidden space-y-1 lg:block">
        {STEPS.map((s, i) => {
          const state =
            i < currentStep ? "done" : i === currentStep ? "current" : "upcoming";
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={state === "upcoming"}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                  state === "current" && "bg-muted",
                  state === "done" && "hover:bg-muted",
                  state === "upcoming" && "cursor-not-allowed opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-medium",
                    (state === "current" || state === "done") &&
                      "border-foreground bg-foreground text-background",
                    state === "upcoming" && "border-border text-muted-foreground"
                  )}
                >
                  {state === "done" ? <Check className="size-3" /> : i + 1}
                </span>
                <span>
                  <span className="block text-[13px] font-medium leading-tight">
                    {s.title}
                  </span>
                  <span className="block text-[11.5px] leading-tight text-muted-foreground">
                    {s.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-medium">{label}</label>
      {children}
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BasicsStep({
  formData,
  set,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
}) {
  return (
    <div className="space-y-5">
      <Field label="Name">
        <Input
          value={formData.name}
          onChange={(e) => set("name")(e.target.value)}
          placeholder="e.g. Compress video to 720p"
        />
      </Field>

      <Field
        label="Description"
        hint="One or two sentences describing what this preset does."
      >
        <Textarea
          value={formData.description}
          onChange={(e) => set("description")(e.target.value)}
          placeholder="Compresses an MP4 to 720p H.264 at a target bitrate. Keeps the audio track."
          rows={3}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category">
          <Select value={formData.category} onValueChange={set("category")}>
            <SelectTrigger>
              <SelectValue placeholder="Pick one…" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Tool">
          <Select value={formData.tool} onValueChange={set("tool")}>
            <SelectTrigger>
              <SelectValue placeholder="Pick one…" />
            </SelectTrigger>
            <SelectContent>
              {TOOLS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Tags" hint="Press Enter to add a tag.">
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTag();
              }
            }}
            placeholder="e.g. compression"
          />
          <Button type="button" variant="outline" onClick={onAddTag}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {formData.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="gap-1.5">
                {tag}
                <button
                  type="button"
                  onClick={() => onRemoveTag(i)}
                  aria-label={`Remove ${tag}`}
                  className="opacity-70 transition-opacity hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </Field>

      <Field
        label="Visibility"
        hint="Public presets appear on /presets and are searchable."
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set("is_public")(true)}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-left text-[12.5px] transition-colors",
              formData.is_public
                ? "border-foreground bg-muted"
                : "border-border hover:border-border-strong"
            )}
          >
            <div className="font-medium">Public</div>
            <div className="text-muted-foreground">Anyone can find &amp; fork it.</div>
          </button>
          <button
            type="button"
            onClick={() => set("is_public")(false)}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-left text-[12.5px] transition-colors",
              !formData.is_public
                ? "border-foreground bg-muted"
                : "border-border hover:border-border-strong"
            )}
          >
            <div className="font-medium">Private</div>
            <div className="text-muted-foreground">Only you can see it.</div>
          </button>
        </div>
      </Field>
    </div>
  );
}

function CommandStep({ formData, set }) {
  return (
    <div className="space-y-5">
      <Field
        label="Command template"
        hint="Use {input_file}, {output_file}, or any variables you declare in the next step."
      >
        <Textarea
          value={formData.command_template}
          onChange={(e) => set("command_template")(e.target.value)}
          placeholder="ffmpeg -i {input_file} -vf scale=-2:720 -c:v libx264 -crf 23 -c:a copy {output_file}"
          rows={5}
          className="font-mono text-[12.5px]"
        />
      </Field>

      <div className="surface bg-muted/30 p-4">
        <p className="text-[12px] font-medium">Tips</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] text-muted-foreground">
          <li>
            Reference inputs and outputs as <code className="text-mono">{`{name}`}</code>.
          </li>
          <li>Quote paths in case filenames contain spaces.</li>
          <li>Prefer non-destructive flags so users can re-run safely.</li>
        </ul>
      </div>
    </div>
  );
}

function IoStep({
  formData,
  updatePattern,
  addPattern,
  removePattern,
  extInputs,
  setExtInputs,
  addExtension,
  removeExtension,
}) {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight">Inputs</h3>
            <p className="text-[12px] text-muted-foreground">
              Files your command will read.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addPattern("input_file_patterns")}
          >
            <Plus className="size-3.5" /> Add input
          </Button>
        </div>

        <div className="space-y-3">
          {formData.input_file_patterns.map((p, i) => (
            <div key={i} className="surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] text-muted-foreground">
                  Input {i + 1}
                </span>
                {formData.input_file_patterns.length > 1 && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removePattern("input_file_patterns", i)}
                    aria-label="Remove input"
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Variable">
                  <Input
                    value={p.name}
                    onChange={(e) =>
                      updatePattern("input_file_patterns", i, "name", e.target.value)
                    }
                    placeholder="input_file"
                  />
                </Field>
                <Field label="Description">
                  <Input
                    value={p.description}
                    onChange={(e) =>
                      updatePattern(
                        "input_file_patterns",
                        i,
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="The video to compress"
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Allowed extensions" hint="Press Enter to add.">
                  <div className="flex gap-2">
                    <Input
                      value={extInputs[i] || ""}
                      onChange={(e) =>
                        setExtInputs((s) => ({ ...s, [i]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addExtension(i, extInputs[i] || "");
                        }
                      }}
                      placeholder=".mp4"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addExtension(i, extInputs[i] || "")}
                    >
                      Add
                    </Button>
                  </div>
                  {p.extensions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.extensions.map((ext, ei) => (
                        <Badge key={ei} variant="outline" className="gap-1">
                          {ext}
                          <button
                            type="button"
                            onClick={() => removeExtension(i, ei)}
                            aria-label={`Remove ${ext}`}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight">Outputs</h3>
            <p className="text-[12px] text-muted-foreground">
              Files your command will produce.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addPattern("output_file_patterns")}
          >
            <Plus className="size-3.5" /> Add output
          </Button>
        </div>
        <div className="space-y-3">
          {formData.output_file_patterns.map((p, i) => (
            <div key={i} className="surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] text-muted-foreground">
                  Output {i + 1}
                </span>
                {formData.output_file_patterns.length > 1 && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removePattern("output_file_patterns", i)}
                    aria-label="Remove output"
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Variable">
                  <Input
                    value={p.name}
                    onChange={(e) =>
                      updatePattern(
                        "output_file_patterns",
                        i,
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="output_file"
                  />
                </Field>
                <Field label="Filename template">
                  <Input
                    value={p.template}
                    onChange={(e) =>
                      updatePattern(
                        "output_file_patterns",
                        i,
                        "template",
                        e.target.value
                      )
                    }
                    placeholder="compressed_{input_file}.mp4"
                  />
                </Field>
              </div>
              <Field label="Description">
                <Input
                  value={p.description}
                  onChange={(e) =>
                    updatePattern(
                      "output_file_patterns",
                      i,
                      "description",
                      e.target.value
                    )
                  }
                  placeholder="Compressed video"
                />
              </Field>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReviewStep({ formData }) {
  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Preset
        </span>
        <h3 className="mt-1.5 text-[18px] font-semibold tracking-tight">
          {formData.name || "Untitled preset"}
        </h3>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          {formData.description || "No description"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {formData.category && (
            <Badge variant="outline" className="capitalize">
              {formData.category}
            </Badge>
          )}
          {formData.tool && (
            <Badge variant="secondary" className="capitalize">
              {formData.tool}
            </Badge>
          )}
          {formData.tags.map((tag, i) => (
            <Badge key={i} variant="secondary">
              {tag}
            </Badge>
          ))}
          <Badge variant="outline">
            {formData.is_public ? "Public" : "Private"}
          </Badge>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-[12px] text-muted-foreground">
          Command
        </div>
        <pre className="code-block max-w-full overflow-x-auto rounded-none border-0">
          {formData.command_template || "—"}
        </pre>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface p-4">
          <h4 className="text-[12.5px] font-semibold">Inputs</h4>
          <ul className="mt-2 space-y-1 text-[12.5px] text-muted-foreground">
            {formData.input_file_patterns.map((p, i) => (
              <li key={i} className="text-mono">
                {p.name || `input_${i + 1}`}{" "}
                {p.extensions.length > 0
                  ? `(${p.extensions.join(", ")})`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="surface p-4">
          <h4 className="text-[12.5px] font-semibold">Outputs</h4>
          <ul className="mt-2 space-y-1 text-[12.5px] text-muted-foreground">
            {formData.output_file_patterns.map((p, i) => (
              <li key={i} className="text-mono">
                {p.name || `output_${i + 1}`}{" "}
                {p.template ? `→ ${p.template}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
