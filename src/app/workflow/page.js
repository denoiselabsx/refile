"use client";

import { useCallback, useRef, useState } from "react";
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
import { Play, Save, Sparkles, Trash2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";

import { AppShell } from "@/components/shell/app-shell";
import { WorkflowSidebar } from "@/components/workflow-sidebar";
import { PresetNode } from "@/components/preset-node";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
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
      { id: "node-1", type: "preset", position: { x: 100, y: 100 }, data: { label: "Extract Video Thumbnail", preset: { id: "preset-video-thumbnail", name: "Extract Video Thumbnail", category: "video", tool: "FFmpeg" }, description: "Extract a frame from video as thumbnail image", category: "video", tool: "FFmpeg" } },
      { id: "node-2", type: "preset", position: { x: 100, y: 260 }, data: { label: "Extract Audio from Video", preset: { id: "preset-video-extract-audio", name: "Extract Audio from Video", category: "video", tool: "FFmpeg" }, description: "Extract audio track from video files as MP3", category: "video", tool: "FFmpeg" } },
      { id: "node-3", type: "preset", position: { x: 420, y: 100 }, data: { label: "Compress Image", preset: { id: "preset-image-compress", name: "Compress Image", category: "image", tool: "ImageMagick" }, description: "Reduce image file size while maintaining visual quality", category: "image", tool: "ImageMagick" } },
    ],
    edges: [{ id: "edge-1", source: "node-1", target: "node-3", animated: true }],
  },
  {
    id: "example-image-pipeline",
    name: "Image pipeline",
    description: "Resize → grayscale → compress.",
    nodes: [
      { id: "node-1", type: "preset", position: { x: 60, y: 150 }, data: { label: "Resize Image", preset: { id: "preset-image-resize", name: "Resize Image", category: "image", tool: "ImageMagick" }, description: "Resize images to specified dimensions", category: "image", tool: "ImageMagick" } },
      { id: "node-2", type: "preset", position: { x: 340, y: 150 }, data: { label: "Convert to Grayscale", preset: { id: "preset-image-grayscale", name: "Convert to Grayscale", category: "image", tool: "ImageMagick" }, description: "Convert color images to grayscale", category: "image", tool: "ImageMagick" } },
      { id: "node-3", type: "preset", position: { x: 620, y: 150 }, data: { label: "Compress Image", preset: { id: "preset-image-compress", name: "Compress Image", category: "image", tool: "ImageMagick" }, description: "Reduce image file size", category: "image", tool: "ImageMagick" } },
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2", animated: true },
      { id: "edge-2", source: "node-2", target: "node-3", animated: true },
    ],
  },
];

function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowName, setWorkflowName] = useState("Untitled workflow");
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

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

  const saveWorkflow = useMutation(api.workflows.save);
  const { isAuthenticated } = useAuth();

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save workflows");
      return;
    }
    setIsSaving(true);
    try {
      await saveWorkflow({ name: workflowName, nodes, edges });
      toast.success("Workflow saved");
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

  const handleLoadExample = (exampleId) => {
    const example = EXAMPLE_WORKFLOWS.find((w) => w.id === exampleId);
    if (!example) return;
    setNodes(example.nodes);
    setEdges(example.edges);
    setWorkflowName(example.name);
    setShowExamples(false);
  };

  return (
    <>
      <div className="flex h-screen flex-col" ref={reactFlowWrapper}>
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-5">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="size-4 text-muted-foreground" />
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="h-8 max-w-[280px] border-transparent bg-transparent px-2 text-[13px] font-medium hover:border-border"
              placeholder="Untitled workflow"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setShowExamples((v) => !v)}>
              <FlaskConical className="size-3.5" /> Examples
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmClear(true)}
              disabled={nodes.length === 0}
            >
              <Trash2 className="size-3.5" /> Clear
            </Button>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <Button size="sm" variant="outline" onClick={handleSave} loading={isSaving}>
              <Save className="size-3.5" /> Save
            </Button>
            <Button size="sm" onClick={handleExecute} loading={isExecuting} disabled={nodes.length === 0}>
              <Play className="size-3.5" /> Run
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <WorkflowSidebar />

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
                style: { stroke: "var(--foreground)", strokeOpacity: 0.45, strokeWidth: 1.25 },
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
                className="!rounded-lg !border !border-border !bg-card"
                maskColor="color-mix(in oklch, var(--background) 75%, transparent)"
                nodeColor={() => "var(--foreground)"}
              />

              {nodes.length === 0 && (
                <Panel position="top-center" className="pt-10">
                  <div className="surface flex max-w-md flex-col items-center gap-3 px-6 py-7 text-center">
                    <Sparkles className="size-5 text-muted-foreground" />
                    <h3 className="text-[14px] font-semibold tracking-tight">
                      Build a workflow
                    </h3>
                    <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                      Drag presets from the left, connect them with edges. Or load
                      an example to start.
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setShowExamples(true)}>
                      <FlaskConical className="size-3.5" /> Load example
                    </Button>
                  </div>
                </Panel>
              )}

              {showExamples && (
                <Panel position="top-right" className="m-3">
                  <div className="surface w-[300px] p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold tracking-tight">Examples</h3>
                      <Button size="icon-sm" variant="ghost" onClick={() => setShowExamples(false)}>
                        <span className="text-[12px]">✕</span>
                      </Button>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {EXAMPLE_WORKFLOWS.map((ex) => (
                        <li key={ex.id}>
                          <button
                            onClick={() => handleLoadExample(ex.id)}
                            className="w-full rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-border-strong"
                          >
                            <p className="text-[12.5px] font-medium tracking-tight">{ex.name}</p>
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

          {/* Inspector */}
          {selectedNode && (
            <aside className="w-72 border-l border-border bg-background p-5">
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
      <span className={`truncate text-[12px] font-medium ${mono ? "text-mono" : "capitalize"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <AppShell className="!min-h-0">
      <ReactFlowProvider>
        <WorkflowCanvas />
      </ReactFlowProvider>
    </AppShell>
  );
}
