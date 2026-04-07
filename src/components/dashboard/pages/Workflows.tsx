import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';
import { 
  Play, 
  GitBranch, 
  Bot, 
  User, 
  Plus, 
  MoreHorizontal, 
  ArrowRight, 
  Zap, 
  Search, 
  MousePointer2, 
  Hand, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Clock,
  Mail,
  MessageSquare,
  ShieldAlert,
  Database,
  Code,
  X,
  Save,
  History,
  Trash2,
  Copy
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ── Custom Node Components ──

const CustomNode = ({ data, selected, type }: NodeProps) => {
  const Icon = data.icon || Play;
  const color = data.color || 'bg-primary';
  
  return (
    <div className={cn(
      "w-64 bg-card border border-border rounded-2xl p-4 shadow-xl transition-all group",
      selected ? "ring-2 ring-primary border-primary/50" : "hover:border-primary/40"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-lg", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground leading-none">{data.label}</h3>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{type}</span>
        </div>
        <button className="ml-auto p-1 hover:bg-accent rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{data.description}</p>
      
      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-card border-2 border-border rounded-full hover:border-primary transition-colors !-left-1.5" 
      />
      
      {type === 'condition' ? (
        <>
          <div className="mt-4 flex justify-between px-2">
            <span className="text-[9px] font-bold text-green-500 uppercase tracking-tighter">True</span>
            <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">False</span>
          </div>
          <Handle 
            type="source" 
            position={Position.Right} 
            id="true"
            className="w-3 h-3 bg-green-500 border-2 border-card rounded-full !top-3/4 !-right-1.5" 
          />
          <Handle 
            type="source" 
            position={Position.Right} 
            id="false"
            className="w-3 h-3 bg-red-500 border-2 border-card rounded-full !top-2/3 !-right-1.5" 
          />
        </>
      ) : (
        <Handle 
          type="source" 
          position={Position.Right} 
          className="w-3 h-3 bg-card border-2 border-border rounded-full hover:border-primary transition-colors !-right-1.5" 
        />
      )}
    </div>
  );
};

const nodeTypes = {
  trigger: CustomNode,
  condition: CustomNode,
  action: CustomNode,
  ai_classify: CustomNode,
  send_message: CustomNode,
};

// ── Sidebar Categories ──

const sidebarNodeTypes = [
  { category: 'Triggers', items: [
    { type: 'trigger', label: 'New Message', icon: MessageSquare, color: 'bg-green-500', description: 'When a customer sends a message' },
    { type: 'trigger', label: 'New Customer', icon: User, color: 'bg-green-500', description: 'When a new contact record is created' },
    { type: 'trigger', label: 'SLA Breached', icon: Clock, color: 'bg-green-500', description: 'When a conversation exceeds SLA' },
  ]},
  { category: 'Logic', items: [
    { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-yellow-500', description: 'Filter flow based on rules' },
    { type: 'ai_classify', label: 'AI Classify', icon: Zap, color: 'bg-purple-500', description: 'Detect intent using AI' },
    { type: 'condition', label: 'Wait', icon: Clock, color: 'bg-yellow-500', description: 'Pause flow for set duration' },
  ]},
  { category: 'Actions', items: [
    { type: 'send_message', label: 'AI Response', icon: Bot, color: 'bg-blue-500', description: 'Send dynamic reply using AI' },
    { type: 'action', label: 'Send Email', icon: Mail, color: 'bg-blue-500', description: 'Notify customer via email' },
    { type: 'action', label: 'Update Attribute', icon: Database, color: 'bg-blue-500', description: 'Update CRM field' },
    { type: 'action', label: 'Escalate', icon: ShieldAlert, color: 'bg-red-500', description: 'Tag and assign to human' },
  ]}
];

// ── Main Component ──

export const Workflows = ({ workspaceId }: { workspaceId: string }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const { toast } = useToast();

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep', style: { stroke: 'var(--primary)', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const fetchWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.automations.workflows.list(workspaceId);
      setWorkflows(data);
      if (data.length > 0 && !activeWorkflowId) {
        loadWorkflow(data[0]);
      }
    } catch (error: any) {
      toast("Error", "Failed to fetch workflows", "error");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, activeWorkflowId]);

  useEffect(() => {
    fetchWorkflows();
  }, [workspaceId]);

  const loadWorkflow = (workflow: any) => {
    setActiveWorkflowId(workflow.id);
    const graph = workflow.graph || { nodes: [], edges: [] };
    // React Flow needs specific node properties (position, icon components restored)
    const revivedNodes = (graph.nodes || []).map((n: any) => {
      // Find the icon based on label in sidebarNodeTypes
      let icon = MessageSquare;
      let color = 'bg-primary';
      for (const cat of sidebarNodeTypes) {
        const item = cat.items.find(i => i.label === n.data.label);
        if (item) {
          icon = item.icon;
          color = item.color;
          break;
        }
      }
      return { ...n, data: { ...n.data, icon, color } };
    });
    setNodes(revivedNodes);
    setEdges(graph.edges || []);
  };

  const handleSaveWorkflow = async () => {
    if (!activeWorkflowId) return;
    try {
      setIsSaving(true);
      // Strip icons/circular refs before saving to JSON
      const cleanNodes = nodes.map(n => ({
        ...n,
        data: { label: n.data.label, description: n.data.description }
      }));
      
      await api.automations.workflows.update(activeWorkflowId, {
        graph: { nodes: cleanNodes, edges }
      });
      toast("Success", "Workflow saved successfully", "success");
    } catch (error: any) {
      toast("Error", "Failed to save workflow", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');
      const color = event.dataTransfer.getData('application/reactflow/color');
      const description = event.dataTransfer.getData('application/reactflow/description');

      if (typeof type === 'undefined' || !type) return;

      const position = { x: event.clientX - 400, y: event.clientY - 200 };
      const newNode: Node = {
        id: `node_${nodes.length + 1}_${Date.now()}`,
        type,
        position,
        data: { label, description, color, icon: Zap }, // Icon needs restoration on load
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, setNodes]
  );

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden gap-2 p-2">
      {/* Left Sidebar: Node Types */}
      <div className="w-72 border border-border bg-card flex flex-col shrink-0 overflow-hidden rounded-2xl shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">Node Palette</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search components..." 
              className="w-full pl-9 pr-4 py-2 bg-accent/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
          {sidebarNodeTypes.map((section) => (
            <div key={section.category} className="space-y-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                {section.category}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div 
                    key={item.label}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/reactflow/type', item.type);
                      event.dataTransfer.setData('application/reactflow/label', item.label);
                      event.dataTransfer.setData('application/reactflow/color', item.color);
                      event.dataTransfer.setData('application/reactflow/description', item.description);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    className="flex items-center gap-3 p-3 bg-accent/30 hover:bg-accent border border-transparent hover:border-border rounded-xl cursor-grab active:cursor-grabbing transition-all group"
                  >
                    <div className={cn("w-8 h-8 rounded-lg bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform")}>
                      <item.icon className={cn("w-4 h-4", item.color === 'bg-green-500' ? 'text-green-500' : 
                                              item.color === 'bg-yellow-500' ? 'text-yellow-500' :
                                              item.color === 'bg-blue-500' ? 'text-blue-500' :
                                              item.color === 'bg-purple-500' ? 'text-purple-500' :
                                              'text-red-500')} />
                    </div>
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Builder Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Builder Header */}
        <div className="h-16 border border-border flex items-center justify-between px-8 shrink-0 bg-card rounded-2xl shadow-sm mb-2">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-foreground">
                {activeWorkflow?.name || "Untitled Flow"}
              </h1>
              <span className="text-[10px] text-muted-foreground font-medium">
                Version {activeWorkflow?.version || 1} • Saved 2 mins ago
              </span>
            </div>
            {activeWorkflow?.is_active && (
              <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Active</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-accent/50 p-1 rounded-xl border border-border mr-2">
              <button className="p-2 hover:bg-card rounded-lg text-muted-foreground transition-all">
                <History className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-card rounded-lg text-muted-foreground transition-all">
                <Copy className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-card rounded-lg text-red-500 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              onClick={handleSaveWorkflow}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-accent text-foreground border border-border rounded-xl text-xs font-bold hover:bg-accent/80 transition-all btn-press",
                isSaving && "opacity-50 cursor-not-allowed"
              )}
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              Publish Flow
            </button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            colorMode="dark"
            className="bg-dot-pattern"
          >
            <Background color="var(--border)" gap={24} size={1} />
            <Controls className="!bg-card !border-border !fill-foreground !shadow-2xl !rounded-xl overflow-hidden" />
            <MiniMap 
              className="!bg-card/80 !border-border !rounded-2xl !shadow-2xl overflow-hidden backdrop-blur-xl" 
              nodeColor={(n) => (n.data?.color === 'bg-green-500' ? '#22c55e' : '#3b82f6')}
              maskColor="rgba(var(--background), 0.7)"
            />
            <Panel position="top-right" className="bg-card/80 border border-border p-2 rounded-xl backdrop-blur-md flex items-center gap-4 px-4 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-foreground">LIVE SYNC</span>
              </div>
              <div className="w-[1px] h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Triggers</span>
                <span className="text-[10px] font-bold text-foreground">12</span>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};
