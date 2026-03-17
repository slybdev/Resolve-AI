import React, { useState } from 'react';
import { 
  MessageSquare, Plus, Search, Filter, MoreHorizontal, 
  Zap, Clock, Edit3, Trash2, Copy, Tag,
  ChevronRight, CheckCircle2, AlertCircle, Settings,
  Terminal, Hash, User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface Macro {
  id: string;
  name: string;
  shortcut: string;
  content: string;
  usageCount: number;
  lastUsed: string;
  category: string;
}

const mockMacros: Macro[] = [
  {
    id: '1',
    name: 'Welcome Greeting',
    shortcut: '/hi',
    content: 'Hello {{customer.name}}, thank you for reaching out! How can I help you today?',
    usageCount: 1242,
    lastUsed: '2 mins ago',
    category: 'General',
  },
  {
    id: '2',
    name: 'Refund Policy',
    shortcut: '/refund',
    content: 'Our refund policy allows for full returns within 30 days of purchase. Would you like me to start that process for you?',
    usageCount: 452,
    lastUsed: '1 hour ago',
    category: 'Billing',
  },
  {
    id: '3',
    name: 'Technical Escalation',
    shortcut: '/tech',
    content: "I'm escalating this to our technical team. They will get back to you within 24 hours.",
    usageCount: 892,
    lastUsed: 'Yesterday',
    category: 'Support',
  },
  {
    id: '4',
    name: 'Meeting Link',
    shortcut: '/call',
    content: 'You can book a call with our team here: https://calendly.com/stark-ai',
    usageCount: 156,
    lastUsed: '3 days ago',
    category: 'Sales',
  },
];

export const Macros = ({ workspaceId }: { workspaceId: string }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Macros & Snippets
          </h1>
          <p className="text-sm text-muted-foreground">Pre-written responses to help your team reply faster.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Create Macro
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 border-b border-border flex items-center gap-4 bg-card/30">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search macros by name or shortcut..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-accent/30 border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {['All', 'General', 'Billing', 'Support', 'Sales'].map((cat) => (
            <button key={cat} className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all">
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockMacros.map((macro) => (
            <motion.div 
              key={macro.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-3xl p-6 hover:border-primary/50 transition-all group shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{macro.name}</h3>
                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{macro.shortcut}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-accent rounded-lg transition-all" title="Edit">
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="p-2 hover:bg-accent rounded-lg transition-all" title="Copy">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="p-2 hover:bg-accent rounded-lg transition-all" title="Delete">
                    <Trash2 className="w-4 h-4 text-red-500/70" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-accent/30 border border-border rounded-2xl p-4 mb-4">
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "{macro.content}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{macro.usageCount} uses</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{macro.lastUsed}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-accent px-2 py-1 rounded-md">
                  {macro.category}
                </span>
              </div>
            </motion.div>
          ))}

          <button className="border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all group min-h-[200px]">
            <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-all">Create New Macro</h3>
              <p className="text-xs text-muted-foreground">Save time by automating common responses.</p>
            </div>
          </button>
        </div>

        {/* Dynamic Variables Guide */}
        <div className="mt-12 bg-primary/5 border border-primary/10 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Dynamic Variables</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Use these placeholders in your macros to automatically insert customer data.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { var: '{{customer.name}}', desc: "Customer's full name" },
              { var: '{{customer.first_name}}', desc: "Customer's first name" },
              { var: '{{agent.name}}', desc: "Your full name" },
              { var: '{{ticket.id}}', desc: "Conversation ID" },
            ].map((v) => (
              <div key={v.var} className="bg-card border border-border p-4 rounded-2xl">
                <code className="text-[10px] font-mono text-primary block mb-1">{v.var}</code>
                <span className="text-[10px] text-muted-foreground">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
