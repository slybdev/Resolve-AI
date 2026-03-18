import React, { useState } from 'react';
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
  Code
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'framer-motion';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'ai-response' | 'escalation' | 'action';
  label: string;
  description: string;
  icon: any;
  color: string;
  position: { x: number; y: number };
}

const initialNodes: WorkflowNode[] = [
  { id: '1', type: 'trigger', label: 'New Message', description: 'When a customer starts a chat', icon: Play, color: 'bg-green-500', position: { x: 100, y: 200 } },
  { id: '2', type: 'condition', label: 'Check Sentiment', description: 'If sentiment is negative', icon: GitBranch, color: 'bg-yellow-500', position: { x: 400, y: 200 } },
  { id: '3', type: 'ai-response', label: 'AI Response', description: 'Send empathetic reply', icon: Bot, color: 'bg-blue-500', position: { x: 700, y: 100 } },
  { id: '4', type: 'escalation', label: 'Escalate', description: 'Transfer to human agent', icon: User, color: 'bg-red-500', position: { x: 700, y: 300 } }
];

const nodeTypes = [
  { category: 'Triggers', items: [
    { label: 'New Message', icon: MessageSquare, color: 'text-green-500' },
    { label: 'New Customer', icon: User, color: 'text-green-500' },
    { label: 'SLA Breached', icon: Clock, color: 'text-green-500' },
  ]},
  { category: 'Logic', items: [
    { label: 'Condition', icon: GitBranch, color: 'text-yellow-500' },
    { label: 'Wait', icon: Clock, color: 'text-yellow-500' },
    { label: 'Split Test', icon: GitBranch, color: 'text-yellow-500' },
  ]},
  { category: 'Actions', items: [
    { label: 'AI Response', icon: Bot, color: 'text-blue-500' },
    { label: 'Send Email', icon: Mail, color: 'text-blue-500' },
    { label: 'Update Attribute', icon: Database, color: 'text-blue-500' },
    { label: 'Escalate', icon: ShieldAlert, color: 'text-red-500' },
    { label: 'Custom Code', icon: Code, color: 'text-purple-500' },
  ]}
];

export const Workflows = ({ workspaceId }: { workspaceId: string }) => {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden gap-2 p-2">
      {/* Left Sidebar: Node Types */}
      <div className="w-72 border border-border bg-card flex flex-col shrink-0 overflow-hidden rounded-2xl shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">Workflow Nodes</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search nodes..." 
              className="w-full pl-9 pr-4 py-2 bg-accent/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
          {nodeTypes.map((section) => (
            <div key={section.category} className="space-y-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                {section.category}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div 
                    key={item.label}
                    className="flex items-center gap-3 p-3 bg-accent/30 hover:bg-accent border border-transparent hover:border-border rounded-xl cursor-grab active:cursor-grabbing transition-all group"
                  >
                    <div className={cn("w-8 h-8 rounded-lg bg-card flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform")}>
                      <item.icon className={cn("w-4 h-4", item.color)} />
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
            <h1 className="text-sm font-bold text-foreground">Customer Support Flow</h1>
            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[9px] font-bold uppercase">Active</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-accent text-foreground border border-border rounded-xl text-xs font-bold hover:bg-accent/80 transition-colors btn-press">
              Test Flow
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-colors btn-press shadow-lg shadow-primary/20">
              Publish
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-card border border-border rounded-2xl shadow-sm bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px]">
          <div 
            className="absolute inset-0 transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <div className="absolute inset-0 p-20">
              {initialNodes.map((node, i) => (
                <React.Fragment key={node.id}>
                  <motion.div 
                    drag
                    dragMomentum={false}
                    initial={node.position}
                    className="absolute w-64 bg-card border border-border rounded-2xl p-4 shadow-xl cursor-move group hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-lg", node.color)}>
                        <node.icon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{node.label}</h3>
                      <button className="ml-auto p-1 hover:bg-accent rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{node.description}</p>
                    
                    {/* Ports */}
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-card border-2 border-border rounded-full hover:border-primary transition-colors cursor-crosshair" />
                    <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-card border-2 border-border rounded-full hover:border-primary transition-colors cursor-crosshair" />
                  </motion.div>
                </React.Fragment>
              ))}

              {/* SVG Connections (Mock) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <path d="M 364 215 L 400 215" stroke="var(--border)" strokeWidth="2" fill="none" />
                <path d="M 664 215 L 700 115" stroke="var(--border)" strokeWidth="2" fill="none" />
                <path d="M 664 215 L 700 315" stroke="var(--border)" strokeWidth="2" fill="none" />
              </svg>
            </div>
          </div>

          {/* Canvas Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/80 border border-border p-2 rounded-2xl backdrop-blur-xl shadow-2xl">
            <button className="p-2 hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground transition-colors btn-press">
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground transition-colors btn-press">
              <Hand className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-6 bg-border mx-1" />
            <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors btn-press">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold text-muted-foreground w-12 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 10, 150))} className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors btn-press">
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-6 bg-border mx-1" />
            <button className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors btn-press">
              <Maximize className="w-4 h-4" />
            </button>
          </div>

          {/* Mini Map (Mock) */}
          <div className="absolute bottom-8 right-8 w-48 h-32 bg-card/80 border border-border rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden p-2">
            <div className="w-full h-full bg-accent/30 rounded-lg relative">
              <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-primary/50 bg-primary/5 rounded shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
