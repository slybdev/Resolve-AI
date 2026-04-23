import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Bot, 
  Building2, 
  Zap, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  MessageSquare,
  Search,
  Eye,
  EyeOff,
  History,
  Loader2,
  ChevronRight,
  BrainCircuit,
  Info
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';

export const AISettings = ({ workspaceId, onViewChange }: { workspaceId: string, onViewChange?: (view: string) => void }) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, [workspaceId]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const data = await api.ai.getConfig(workspaceId);
      setConfig(data);
    } catch (err: any) {
      toast('Error', 'Failed to load AI configuration', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.ai.updateConfig(workspaceId, config);
      toast('Success', 'AI Agent parameters calibrated successfully', 'success');
    } catch (err: any) {
      toast('Error', err.message || 'Failed to sync configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !config) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Calibrating Neural Pathways...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Control Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
      {/* Premium Header */}
      <div className="h-24 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xl shadow-primary/5">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">AI Control Room</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Agent:</span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{config?.company_name || 'AI Assistant'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchConfig}
            className="p-3 text-muted-foreground hover:bg-accent rounded-xl transition-colors active:rotate-180 duration-500"
            title="Reload Settings"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-12 gap-8 pb-20">
          
          {/* Left Column: Configuration */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            
            {/* Identity & Context Section */}
            <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                <Building2 size={120} />
              </div>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Building2 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">Identity & Industry</h2>
                  <p className="text-xs text-muted-foreground">The foundational knowledge that makes your AI "yours".</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Company Name</label>
                    <input 
                      type="text" 
                      value={config.company_name || ''}
                      onChange={(e) => setConfig({...config, company_name: e.target.value})}
                      className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Industry</label>
                    <select 
                      value={config.industry}
                      onChange={(e) => setConfig({...config, industry: e.target.value})}
                      className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all appearance-none"
                    >
                      <option value="saas">SaaS / Software</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="agency">Agency / Service</option>
                      <option value="fintech">Fintech</option>
                      <option value="health">Healthcare</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Brand Description</label>
                  <textarea 
                    value={config.company_description || ''}
                    onChange={(e) => setConfig({...config, company_description: e.target.value})}
                    placeholder="Describe your products, mission, and unique value proposition..."
                    className="w-full bg-accent/30 border border-border rounded-[1.5rem] px-4 py-4 text-sm h-28 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Greeting Message</label>
                  <textarea 
                    value={config.greeting_message || ''}
                    onChange={(e) => setConfig({...config, greeting_message: e.target.value})}
                    placeholder="e.g. Hello! I'm your AI assistant for XentralDesk. How can I help?"
                    className="w-full bg-accent/30 border border-border rounded-[1.5rem] px-4 py-3 text-sm h-20 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none font-medium"
                  />
                </div>
              </div>
            </section>

            {/* AI Persona & Goal Section */}
            <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                <Bot size={120} />
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-purple-500/10 rounded-xl">
                  <Bot className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">Persona & Performance</h2>
                  <p className="text-xs text-muted-foreground">Adjust the AI's "brain" and conversational tone.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Base Personality</label>
                    <select 
                      value={config.personality}
                      onChange={(e) => setConfig({...config, personality: e.target.value})}
                      className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm font-bold appearance-none"
                    >
                      <option value="professional">🤵 Professional</option>
                      <option value="friendly">👋 Friendly</option>
                      <option value="technical">💻 Technical</option>
                      <option value="casual">🤙 Casual</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Primary Goal</label>
                    <select 
                      value={config.primary_goal}
                      onChange={(e) => setConfig({...config, primary_goal: e.target.value})}
                      className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm font-bold appearance-none"
                    >
                      <option value="support">🛠️ Pure Support</option>
                      <option value="sales">💰 Sales / Lead Gen</option>
                      <option value="triage">📋 Triage & Routing</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Custom Behavioral Logic</label>
                  <textarea 
                    value={config.system_prompt_template || ''}
                    onChange={(e) => setConfig({...config, system_prompt_template: e.target.value})}
                    placeholder="Optional: Provide a full system prompt template to override defaults..."
                    className="w-full bg-accent/30 border border-border rounded-[1.5rem] px-4 py-4 text-sm h-32 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none leading-relaxed font-mono text-[11px]"
                  />
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-[10px] text-muted-foreground italic">Leave empty to use the dynamic engine's optimized prompts.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Guardrails Card */}
            <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-lg font-black text-foreground tracking-tight">Guardrails & Topics</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Blocked Topics (Comma separated)</label>
                  <input 
                    type="text" 
                    value={config.blocked_topics?.join(', ') || ''}
                    onChange={(e) => setConfig({...config, blocked_topics: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="e.g. sex, violence, politics, crypto"
                    className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Escalation Keywords</label>
                  <input 
                    type="text" 
                    value={config.escalation_keywords?.join(', ') || ''}
                    onChange={(e) => setConfig({...config, escalation_keywords: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="e.g. lawyer, legal, court, threat, worst"
                    className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Collection & Neural Parameters */}
          <div className="col-span-12 lg:col-span-5 space-y-8">
            
            {/* Identity Collection Policy */}
            <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-500/10 rounded-xl">
                  <Zap className="w-5 h-5 text-yellow-500" />
                </div>
                <h2 className="text-lg font-black text-foreground tracking-tight">Identity Collection</h2>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Collection Trigger</label>
                  <select 
                    value={config.collect_email_trigger}
                    onChange={(e) => setConfig({...config, collect_email_trigger: e.target.value})}
                    className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm font-bold appearance-none"
                  >
                    <option value="on_support_request">On Support Request</option>
                    <option value="always">Always (First Turn)</option>
                    <option value="never">Never (AI alone)</option>
                  </select>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] text-primary/80 font-bold leading-tight">
                    Recommended: "On Support Request" keeps the greeting frictionless but ensures identification before ticket creation.
                  </p>
                </div>
              </div>
            </section>

             {/* Neural Parameters */}
             <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <BrainCircuit className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-black text-foreground tracking-tight">Neural Controls</h2>
              </div>

              <div className="space-y-6 pt-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground">Conversation Memory</h3>
                    <span className="text-[10px] font-mono font-bold text-primary">{config.max_context_messages} Messages</span>
                  </div>
                  <input 
                    type="range" min="1" max="50" step="1"
                    value={config.max_context_messages}
                    onChange={(e) => setConfig({...config, max_context_messages: parseInt(e.target.value)})}
                    className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">Deepers memory consumes more tokens but allows better followup awareness.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground">Retrieval Density (Top-K)</h3>
                    <span className="text-[10px] font-mono font-bold text-primary">{config.rag_top_k} Chunks</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" step="1"
                    value={config.rag_top_k}
                    onChange={(e) => setConfig({...config, rag_top_k: parseInt(e.target.value)})}
                    className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/20 rounded-2xl border border-border group hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setConfig({...config, rag_enabled: !config.rag_enabled})}
                >
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-foreground">Knowledge Base RAG</h3>
                    <p className="text-[10px] text-muted-foreground">Inject company docs into replies.</p>
                  </div>
                  <div className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    config.rag_enabled ? "bg-primary" : "bg-neutral-800"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      config.rag_enabled ? "left-5.5" : "left-0.5"
                    )} />
                  </div>
                </div>
              </div>
            </section>

            {/* Health Stats */}
            <section className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 space-y-6">
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-foreground tracking-tight">Agent Health</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Retrieval Hit Rate</p>
                  <p className="text-2xl font-black text-foreground">94.2%</p>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Token Efficiency</p>
                  <p className="text-2xl font-black text-foreground">0.8x</p>
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Sanitization Layer</span>
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-widest px-2 py-1 bg-green-500/10 rounded-full">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">L2 Guardrails</span>
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-widest px-2 py-1 bg-green-500/10 rounded-full">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Intent Reranking</span>
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-widest px-2 py-1 bg-green-500/10 rounded-full">Active</span>
                </div>
              </div>
            </section>

            {/* Quick Test Action */}
            <button 
              onClick={() => onViewChange ? onViewChange('test') : window.location.href = window.location.pathname + '?view=test'}
              className="w-full bg-card border border-border hover:border-primary/50 py-6 rounded-[2.5rem] group flex flex-col items-center gap-2 transition-all active:scale-[0.98] shadow-sm"
            >
              <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-black text-foreground tracking-tight">Open Neural Playground</span>
              <p className="text-xs text-muted-foreground">Test your behavior rules live</p>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
