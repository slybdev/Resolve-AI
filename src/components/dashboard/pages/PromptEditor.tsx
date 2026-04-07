import React, { useState } from 'react';
import { Cpu, Save, RefreshCw, Play, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const PromptEditor = ({ workspaceId }: { workspaceId: string }) => {
  const [prompt, setPrompt] = useState(`You are a helpful AI customer support assistant.
Answer questions using the company knowledge base.
If you cannot find an answer, escalate to a human agent.`);

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prompt Editor</h1>
            <p className="text-muted-foreground">Configure the core behavior and system prompt for your AI agent.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-card text-foreground border border-border rounded-xl text-sm font-bold hover:bg-accent transition-colors btn-press">
              <RefreshCw className="w-4 h-4" />
              Reset to Default
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              <Save className="w-4 h-4" />
              Save Prompt
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Main Editor */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col h-[700px] shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-accent/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Prompt</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Live</span>
                </div>
              </div>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 p-8 bg-transparent text-foreground font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-0"
                placeholder="Enter system prompt here..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
