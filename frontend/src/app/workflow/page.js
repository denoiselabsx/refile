"use client";

import { useCallback, useState, useEffect, useRef } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Navbar } from '@/components/navbar';
import { WorkflowSidebar } from '@/components/workflow-sidebar';
import { PresetNode } from '@/components/preset-node';
import { Button } from '@/components/ui/button';
import { Play, Save, Upload, Download, Trash2 } from 'lucide-react';

const nodeTypes = {
  preset: PresetNode,
};

// Hardcoded example workflows
const EXAMPLE_WORKFLOWS = [
  {
    id: 'example-video-processing',
    name: 'Video to Audio & Thumbnail',
    description: 'Extract audio and thumbnail from video',
    nodes: [
      {
        id: 'node-1',
        type: 'preset',
        position: { x: 100, y: 100 },
        data: {
          label: 'Extract Video Thumbnail',
          preset: {
            id: 'preset-video-thumbnail',
            name: 'Extract Video Thumbnail',
            description: 'Extract a frame from video as thumbnail image',
            category: 'video',
            tool: 'FFmpeg',
          },
          description: 'Extract a frame from video as thumbnail image',
          category: 'video',
          tool: 'FFmpeg',
        },
      },
      {
        id: 'node-2',
        type: 'preset',
        position: { x: 100, y: 250 },
        data: {
          label: 'Extract Audio from Video',
          preset: {
            id: 'preset-video-extract-audio',
            name: 'Extract Audio from Video',
            description: 'Extract audio track from video files as MP3',
            category: 'video',
            tool: 'FFmpeg',
          },
          description: 'Extract audio track from video files as MP3',
          category: 'video',
          tool: 'FFmpeg',
        },
      },
      {
        id: 'node-3',
        type: 'preset',
        position: { x: 400, y: 100 },
        data: {
          label: 'Compress Image',
          preset: {
            id: 'preset-image-compress',
            name: 'Compress Image',
            description: 'Reduce image file size while maintaining visual quality',
            category: 'image',
            tool: 'ImageMagick',
          },
          description: 'Reduce image file size while maintaining visual quality',
          category: 'image',
          tool: 'ImageMagick',
        },
      },
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-3', animated: true },
    ],
  },
  {
    id: 'example-image-pipeline',
    name: 'Image Processing Pipeline',
    description: 'Resize, grayscale, and compress images',
    nodes: [
      {
        id: 'node-1',
        type: 'preset',
        position: { x: 100, y: 150 },
        data: {
          label: 'Resize Image',
          preset: {
            id: 'preset-image-resize',
            name: 'Resize Image',
            description: 'Resize images to specified dimensions',
            category: 'image',
            tool: 'ImageMagick',
          },
          description: 'Resize images to specified dimensions',
          category: 'image',
          tool: 'ImageMagick',
        },
      },
      {
        id: 'node-2',
        type: 'preset',
        position: { x: 350, y: 150 },
        data: {
          label: 'Convert to Grayscale',
          preset: {
            id: 'preset-image-grayscale',
            name: 'Convert to Grayscale',
            description: 'Convert color images to grayscale',
            category: 'image',
            tool: 'ImageMagick',
          },
          description: 'Convert color images to grayscale',
          category: 'image',
          tool: 'ImageMagick',
        },
      },
      {
        id: 'node-3',
        type: 'preset',
        position: { x: 600, y: 150 },
        data: {
          label: 'Compress Image',
          preset: {
            id: 'preset-image-compress',
            name: 'Compress Image',
            description: 'Reduce image file size',
            category: 'image',
            tool: 'ImageMagick',
          },
          description: 'Reduce image file size',
          category: 'image',
          tool: 'ImageMagick',
        },
      },
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2', animated: true },
      { id: 'edge-2', source: 'node-2', target: 'node-3', animated: true },
    ],
  },
];

const initialNodes = [];
const initialEdges = [];

function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const presetData = event.dataTransfer.getData('application/reactflow');

      if (!presetData) {
        return;
      }

      const preset = JSON.parse(presetData);
      
      // Use project to convert screen coordinates to flow coordinates
      const position = project({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${preset.id}-${Date.now()}`,
        type: 'preset',
        position,
        data: {
          label: preset.name,
          preset: preset,
          description: preset.description,
          category: preset.category,
          tool: preset.tool,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes]
  );

  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    try {
      const workflow = {
        name: workflowName,
        nodes: nodes,
        edges: edges,
        created_at: new Date().toISOString(),
      };

      // Save to localStorage for now (can be extended to backend later)
      localStorage.setItem('workflow_' + Date.now(), JSON.stringify(workflow));
      
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (nodes.length === 0) {
      alert('Please add presets to the workflow first');
      return;
    }

    setIsExecuting(true);
    try {
      // TODO: Implement workflow execution logic
      // This will chain preset commands based on node connections
      alert('Workflow execution will be implemented soon!');
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearWorkflow = () => {
    if (confirm('Are you sure you want to clear the entire workflow?')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  };

  const handleLoadExample = (exampleId) => {
    const example = EXAMPLE_WORKFLOWS.find(w => w.id === exampleId);
    if (example) {
      setNodes(example.nodes);
      setEdges(example.edges);
      setWorkflowName(example.name);
      setShowExamples(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Preset Library */}
        <WorkflowSidebar />

        {/* Main Canvas */}
        <div className="flex-1 relative" style={{ backgroundColor: 'var(--background)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid={true}
            snapGrid={[15, 15]}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.2}
            maxZoom={4}
            style={{ backgroundColor: 'var(--background)' }}
          >
            <Controls />
            <MiniMap 
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
              }}
              nodeColor={(node) => {
                switch (node.data.category) {
                  case 'image':
                    return '#3b82f6';
                  case 'video':
                    return '#8b5cf6';
                  case 'audio':
                    return '#10b981';
                  case 'pdf':
                    return '#f59e0b';
                  default:
                    return '#6b7280';
                }
              }}
            />
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1}
              color="var(--muted-foreground)"
              style={{ opacity: 0.2 }}
            />

            {/* Top Control Panel */}
            <Panel position="top-center" className="flex items-center gap-2 p-2 rounded-lg border" style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
            }}>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="px-3 py-1.5 rounded border text-sm font-medium"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                }}
                placeholder="Workflow name"
              />
              
              <div className="h-6 w-px" style={{ backgroundColor: 'var(--border)' }} />

              <Button
                size="sm"
                variant="outline"
                onClick={handleExecuteWorkflow}
                disabled={isExecuting || nodes.length === 0}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isExecuting ? 'Executing...' : 'Run'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveWorkflow}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowExamples(!showExamples)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Examples
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleClearWorkflow}
                disabled={nodes.length === 0}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </Panel>

            {/* Example Workflows Panel */}
            {showExamples && (
              <Panel position="top-right" className="p-4 rounded-lg border w-80" style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
              }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                  Example Workflows
                </h3>
                <div className="space-y-2">
                  {EXAMPLE_WORKFLOWS.map((example) => (
                    <div
                      key={example.id}
                      onClick={() => handleLoadExample(example.id)}
                      className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                      style={{
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <h4 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {example.name}
                      </h4>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        {example.description}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowExamples(false)}
                  className="w-full mt-3"
                >
                  Close
                </Button>
              </Panel>
            )}

            {/* Info Panel */}
            {nodes.length === 0 && (
              <Panel position="top-left" className="p-4 rounded-lg border max-w-md" style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
              }}>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Welcome to Workflow Builder
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Drag presets from the left sidebar onto the canvas and connect them to create powerful automation workflows.
                </p>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right Sidebar - Node Properties (if node selected) */}
        {selectedNode && (
          <div className="w-80 border-l p-4 overflow-y-auto" style={{
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)',
          }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Node Properties
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Name
                </label>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedNode.data.label}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Description
                </label>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedNode.data.description}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Category
                </label>
                <p className="text-sm mt-1 capitalize" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedNode.data.category}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Tool
                </label>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedNode.data.tool}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper component to provide ReactFlow context
export default function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}
