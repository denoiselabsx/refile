"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Play,
  Save,
  Sparkles,
  Trash2,
  FlaskConical,
  PanelLeft,
  X,
  FolderOpen,
  FilePlus,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";

import { AppShell } from "@/components/shell/app-shell";
import { WorkflowSidebar } from "@/components/workflow-sidebar";
import { PresetNode } from "@/components/preset-node";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const nodeTypes = { preset: PresetNode };

const EXAMPLE_WORKFLOWS = [
  {
    id: "example-video-processing",
    name: "Video → audio + thumbnail",
    description: "Extract audio and a thumbnail from a video.",
    nodes: [
      { id: "node-1", type: "preset", position: { x: 100, y: 100 }, data: { label: "Extract Video Thumbnail", preset: { id: "starter-video-thumbnail", name: "Extract Video Thumbnail", category: "video", tool: "ffmpeg" }, description: "Extract a frame from video as thumbnail image", category: "video", tool: "ffmpeg" } },
      { id: "node-2", type: "preset", position: { x: 100, y: 260 }, data: { label: "Extract Audio from Video", preset: { id: "starter-video-extract-audio", name: "Extract Audio from Video", category: "video", tool: "ffmpeg" }, description: "Extract audio track from video files as MP3", category: "video", tool: "ffmpeg" } },
      { id: "node-3", type: "preset", position: { x: 420, y: 100 }, data: { label: "Compress Image", preset: { id: "starter-image-compress", name: "Compress Image", category: "image", tool: "imagemagick" }, description: "Reduce image file size while maintaining visual quality", category: "image", tool: "imagemagick" } },
    ],
    edges: [{ id: "edge-1", source: "node-1", target: "node-3", animated: true }],
  },
  {
    id: "example-image-pipeline",
    name: "Image pipeline",
    description: "Resize → grayscale → compress.",
    nodes: [
      { id: "node-1", type: "preset", position: { x: 60, y: 150 }, data: { label: "Resize Image", preset: { id: "starter-image-resize", name: "Resize Image", category: "image", tool: "imagemagick" }, description: "Resize images to specified dimensions", category: "image", tool: "imagemagick" } },
      { id: "node-2", type: "preset", position: { x: 340, y: 150 }, data: { label: "Convert to Grayscale", preset: { id: "starter-image-grayscale", name: "Convert to Grayscale", category: "image", tool: "imagemagick" }, description: "Convert color images to grayscale", category: "image", tool: "imagemagick" } },
      { id: "node-3", type: "preset", position: { x: 620, y: 150 }, data: { label: "Compress Image", preset: { id: "starter-image-compress", name: "Compress Image", category: "image", tool: "imagemagick" }, description: "Reduce image file size", category: "image", tool: "imagemagick" } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2", animated: true },
      { id: "edge-2", source: "node-2", target: "node-3", animated: true },
    ],
  },
];

function formatRelative(t) {
  if (!t) return "";
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days < 1) return "Today";
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function WorkflowCanvas() {
  const { isAuthenticated } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [workflowName, setWorkflowName] = useState("Untitled workflow");
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

  const savedWorkflows = useQuery(
    api.workflows.listMine,
    isAuthenticated ? {} : "skip"
  );
  const saveWorkflow = useMutation(api.workflows.save);
  const removeWorkflow = useMutation(api.workflows.remove);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_, node) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const presetData = event.dataTransfer.getData("application/reactflow");
      if (!presetData) return;
      const preset = JSON.parse(presetData);
      const position = project({ x: event.clientX, y: event.clientY });
      const newNode = {
        id: `${preset.id}-${Date.now()}`,
        type: "preset",
        position,
        data: {
          label: preset.name,
          preset,
          description: preset.description,
          category: preset.category,
          tool: preset.tool,
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes]
  );

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save workflows");
      return;
    }
    setIsSaving(true);
    try {
      const id = await saveWorkflow({
        id: workflowId ?? undefined,
        name: workflowName.trim() || "Untitled workflow",
        nodes,
        edges,
      });
      setWorkflowId(id);
      toast.success(workflowId ? "Workflow saved" : "Workflow created");
    } catch (err) {
      toast.error("Couldn't save workflow", { description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (nodes.length === 0) {
      toast.error("Add some presets first");
      return;
    }
    setIsExecuting(true);
    try {
      toast("Workflow execution coming soon", {
        description: "We're building the runtime to chain commands together.",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setConfirmClear(false);
  };

  const handleNewWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setWorkflowId(null);
    setWorkflowName("Untitled workflow");
  };

  const handleLoadExample = (exampleId) => {
    const example = EXAMPLE_WORKFLOWS.find((w) => w.id === exampleId);
    if (!example) return;
    setNodes(example.nodes);
    setEdges(example.edges);
    setWorkflowName(example.name);
    setWorkflowId(null);
    setShowExamples(false);
  };

  const handleOpenWorkflow = (wf) => {
    setNodes(wf.nodes || []);
    setEdges(wf.edges || []);
    setWorkflowName(wf.name);
    setWorkflowId(wf._id);
    setSelectedNode(null);
    setShowOpen(false);
  };

  const handleDeleteWorkflow = async (id, e) => {
    e?.stopPropagation();
    if (!confirm("Delete this workflow?")) return;
    try {
      await removeWorkflow({ id });
      if (workflowId === id) handleNewWorkflow();
      toast.success("Workflow deleted");
    } catch (err) {
      toast.error("Couldn't delete", { description: err?.message });
    }
  };

  return (
    <>
      <div className="flex h-full flex-col" ref={reactFlowWrapper}>
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Open preset library"
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden"
            >
              <PanelLeft className="size-[18px]" />
            </Button>
            <Sparkles className="hidden size-4 text-muted-foreground sm:block" />
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="h-8 min-w-0 max-w-[280px] border-transparent bg-transparent px-2 text-[13px] font-medium hover:border-border"
              placeholder="Untitled workflow"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNewWorkflow}
              aria-label="New workflow"
              className="hidden sm:inline-flex"
            >
              <FilePlus className="size-3.5" />
              <span className="hidden md:inline">New</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowOpen(true)}
              disabled={!isAuthenticated}
              aria-label="Open workflow"
            >
              <FolderOpen className="size-3.5" />
              <span className="hidden md:inline">Open</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowExamples((v) => !v)}
            >
              <FlaskConical className="size-3.5" />
              <span className="hidden md:inline">Examples</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmClear(true)}
              disabled={nodes.length === 0}
              aria-label="Clear canvas"
              className="hidden sm:inline-flex"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden md:inline">Clear</span>
            </Button>
            <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              loading={isSaving}
            >
              <Save className="size-3.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExecute}
              loading={isExecuting}
              disabled={nodes.length === 0}
            >
              <Play className="size-3.5" />
              <span className="hidden sm:inline">Run</span>
            </Button>
          </div>
        </header>

        <div className="relative flex flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden sm:block">
            <WorkflowSidebar />
          </div>

          {/* Mobile slide-over sidebar */}
          {sidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm sm:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <aside
                className="fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col bg-background shadow-2xl sm:hidden"
                style={{
                  paddingTop: "env(safe-area-inset-top)",
                  paddingBottom: "env(safe-area-inset-bottom)",
                }}
              >
                <div className="flex h-12 items-center justify-between border-b border-border px-3">
                  <span className="text-[12px] font-medium text-muted-foreground">
                    Presets
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <WorkflowSidebar />
                </div>
              </aside>
            </>
          )}

          <div className="relative flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              minZoom={0.2}
              maxZoom={4}
              proOptions={{ hideAttribution: true }}
              style={{ backgroundColor: "var(--background)" }}
              defaultEdgeOptions={{
                animated: true,
                style: {
                  stroke: "var(--foreground)",
                  strokeOpacity: 0.45,
                  strokeWidth: 1.25,
                },
              }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={22}
                size={1}
                color="color-mix(in oklch, var(--foreground) 18%, transparent)"
              />
              <Controls
                showInteractive={false}
                className="!rounded-lg !border !border-border !bg-card !shadow-sm"
              />
              <MiniMap
                pannable
                zoomable
                className="!hidden !rounded-lg !border !border-border !bg-card sm:!block"
                maskColor="color-mix(in oklch, var(--background) 75%, transparent)"
                nodeColor={() => "var(--foreground)"}
              />

              {nodes.length === 0 && (
                <Panel position="top-center" className="pt-6 sm:pt-10">
                  <div className="surface flex max-w-[20rem] flex-col items-center gap-3 px-5 py-6 text-center sm:max-w-md sm:px-6 sm:py-7">
                    <Sparkles className="size-5 text-muted-foreground" />
                    <h3 className="text-[14px] font-semibold tracking-tight">
                      Build a workflow
                    </h3>
                    <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                      Drag presets from the library, connect them with edges.
                      Or load an example.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowExamples(true)}
                      >
                        <FlaskConical className="size-3.5" /> Load example
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSidebarOpen(true)}
                        className="sm:hidden"
                      >
                        <PanelLeft className="size-3.5" /> Open library
                      </Button>
                    </div>
                  </div>
                </Panel>
              )}

              {showExamples && (
                <Panel
                  position="top-right"
                  className="m-2 max-w-[calc(100vw-1rem)] sm:m-3"
                >
                  <div className="surface w-[280px] p-4 sm:w-[300px]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold tracking-tight">
                        Examples
                      </h3>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setShowExamples(false)}
                        aria-label="Close"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {EXAMPLE_WORKFLOWS.map((ex) => (
                        <li key={ex.id}>
                          <button
                            onClick={() => handleLoadExample(ex.id)}
                            className="w-full rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-border-strong"
                          >
                            <p className="text-[12.5px] font-medium tracking-tight">
                              {ex.name}
                            </p>
                            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                              {ex.description}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>

          {/* Inspector — desktop only; mobile gets a sheet (future) */}
          {selectedNode && (
            <aside className="hidden w-72 shrink-0 border-l border-border bg-background p-5 lg:block">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Node
              </div>
              <h3 className="mt-2 text-[14px] font-semibold tracking-tight">
                {selectedNode.data.label}
              </h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {selectedNode.data.description}
              </p>

              <div className="mt-6 space-y-3">
                <Row label="Category" value={selectedNode.data.category} />
                <Row label="Tool" value={selectedNode.data.tool} />
                <Row label="ID" value={selectedNode.id} mono />
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Open dialog */}
      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open workflow</DialogTitle>
            <DialogDescription>
              Pick a saved workflow to load it onto the canvas.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-1 max-h-[60vh] overflow-y-auto px-1">
            {savedWorkflows === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : savedWorkflows.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[12.5px] text-muted-foreground">
                You haven't saved any workflows yet.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {savedWorkflows.map((wf) => (
                  <li key={wf._id}>
                    <button
                      onClick={() => handleOpenWorkflow(wf)}
                      className="group flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-border-strong"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-[13px] font-medium tracking-tight">
                          {wf.name || "Untitled workflow"}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {(wf.nodes?.length || 0)} node{wf.nodes?.length === 1 ? "" : "s"} ·{" "}
                          {formatRelative(wf._creationTime)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteWorkflow(wf._id, e)}
                        aria-label="Delete workflow"
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleNewWorkflow();
                setShowOpen(false);
              }}
            >
              <FilePlus className="size-3.5" /> Start new
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear workflow?</DialogTitle>
            <DialogDescription>
              This removes all nodes and connections. You can't undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span
        className={`truncate text-[12px] font-medium ${
          mono ? "text-mono" : "capitalize"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <AppShell>
      <div className="h-full">
        <ReactFlowProvider>
          <WorkflowCanvas />
        </ReactFlowProvider>
      </div>
    </AppShell>
  );
}
