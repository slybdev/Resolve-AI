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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Workspace / Identity State
  const [workspace, setWorkspace] = useState<any>(null);
  const [identity, setIdentity] = useState({
    name: '',
    industry: '',
    description: ''
  });

  // Persona State
  const [persona, setPersona] = useState({
    agentName: '',
    tone: 'professional',
    customInstructions: ''
  });

  // Behavioral Settings
  const [settings, setSettings] = useState({
    showSources: true,
    confidenceThreshold: 0.7,
    strictMode: false,
    isAIEnabled: false,
    escalateOnSentiment: false,
    escalateOnHandoff: true,
    escalateOnKBMiss: false,
    highRiskKeywords: "lawyer, refund, manager, legal"
  });

  useEffect(() => {
    fetchWorkspaceData();
  }, [workspaceId]);

  const fetchWorkspaceData = async () => {
    setIsLoading(true);
    try {
      const data = await api.workspaces.get(workspaceId);
      setWorkspace(data);
      setIdentity({
        name: data.name || '',
        industry: data.industry || '',
        description: data.company_description || ''
      });
      setPersona({
        agentName: data.ai_agent_name || 'Resolve Assistant',
        tone: data.ai_tone || 'professional',
        customInstructions: data.ai_custom_instructions || ''
      });
      setSettings({
        showSources: data.ai_settings?.showSources ?? true,
        confidenceThreshold: data.ai_settings?.confidenceThreshold ?? 0.7,
        strictMode: data.ai_settings?.strictMode ?? false,
        isAIEnabled: data.is_ai_enabled ?? false,
        escalateOnSentiment: data.ai_settings?.escalateOnSentiment ?? false,
        escalateOnHandoff: data.ai_settings?.escalateOnHandoff ?? true,
        escalateOnKBMiss: data.ai_settings?.escalateOnKBMiss ?? false,
        highRiskKeywords: data.ai_settings?.highRiskKeywords ?? "lawyer, refund, manager, legal"
      });
    } catch (err: any) {
      toast('Error', 'Failed to load AI settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.workspaces.update(workspaceId, {
        name: identity.name,
        company_description: identity.description,
        industry: identity.industry,
        ai_agent_name: persona.agentName,
        ai_tone: persona.tone,
        ai_custom_instructions: persona.customInstructions,
        ai_settings: {
          showSources: settings.showSources,
          confidenceThreshold: settings.confidenceThreshold,
          strictMode: settings.strictMode,
          escalateOnSentiment: settings.escalateOnSentiment,
          escalateOnHandoff: settings.escalateOnHandoff,
          escalateOnKBMiss: settings.escalateOnKBMiss,
          highRiskKeywords: settings.highRiskKeywords
        },
        is_ai_enabled: settings.isAIEnabled
      });
      toast('Success', 'AI Agent profile updated successfully', 'success');
    } catch (err: any) {
      toast('Error', err.message || 'Failed to update settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

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
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{persona.agentName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchWorkspaceData}
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
            
            {/* Identity Shield Section */}
            <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                <Building2 size={120} />
              </div>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Building2 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">Company Identity</h2>
                  <p className="text-xs text-muted-foreground">The foundational knowledge that makes your AI "yours".</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Workspace Name</label>
                    <input 
                      type="text" 
                      value={identity.name}
                      onChange={(e) => setIdentity({...identity, name: e.target.value})}
                      className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Industry</label>
                    <select 
                      value={identity.industry}
                      onChange={(e) => setIdentity({...identity, industry: e.target.value})}
                      className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all appearance-none"
                    >
                      <option value="SaaS">SaaS</option>
                      <option value="E-commerce">E-commerce</option>
                      <option value="Agency">Agency</option>
                      <option value="Tech Support">Tech Support</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Company Deep Bio</label>
                  <textarea 
                    value={identity.description}
                    onChange={(e) => setIdentity({...identity, description: e.target.value})}
                    placeholder="Describe your products, mission, and unique value proposition..."
                    className="w-full bg-accent/30 border border-border rounded-[1.5rem] px-4 py-4 text-sm h-32 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none leading-relaxed"
                  />
                  <div className="flex items-start gap-2 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-500/80 leading-tight">This bio acts as the fallback context when your knowledge base doesn't have an exact answer.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Persona Section */}
            <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                <Bot size={120} />
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-purple-500/10 rounded-xl">
                  <Bot className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">AI Agent Persona</h2>
                  <p className="text-xs text-muted-foreground">Customize how the AI talks and represents your brand.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Agent Name</label>
                  <input 
                    type="text" 
                    value={persona.agentName}
                    onChange={(e) => setPersona({...persona, agentName: e.target.value})}
                    className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Tone & Voice</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Professional', 'Friendly', 'Technical', 'Concise'].map(t => (
                      <button
                        key={t}
                        onClick={() => setPersona({...persona, tone: t.toLowerCase()})}
                        className={cn(
                          "px-3 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                          persona.tone === t.toLowerCase() 
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                            : "bg-accent/30 border-border text-muted-foreground hover:bg-accent/50"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Behavioral Guardrails (The "Commandments")</label>
                  <textarea 
                    value={persona.customInstructions}
                    onChange={(e) => setPersona({...persona, customInstructions: e.target.value})}
                    placeholder="e.g. NEVER mention competitors. ALWAYS apologize for long wait times. Use emoji sparingly."
                    className="w-full bg-accent/30 border border-border rounded-[1.5rem] px-4 py-4 text-sm h-40 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none leading-relaxed font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-[10px] text-muted-foreground">These rules are injected into every query and cannot be bypassed by users.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Dynamic Settings & Health */}
          <div className="col-span-12 lg:col-span-5 space-y-8">
            
            {/* Guardrails Card */}
            <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-yellow-500/10 rounded-xl">
                    <Zap className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">AI Automation</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-primary/10 rounded-3xl border-2 border-primary/20 group hover:border-primary/50 transition-all shadow-lg shadow-primary/5">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight">AI First Line Response</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">AI handles new chats until an agent takes over.</p>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, isAIEnabled: !settings.isAIEnabled})}
                    className={cn(
                      "w-14 h-7 rounded-full transition-all relative overflow-hidden",
                      settings.isAIEnabled ? "bg-primary shadow-lg shadow-primary/30" : "bg-neutral-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md",
                      settings.isAIEnabled ? "left-8" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/20 rounded-2xl border border-border group hover:border-primary/30 transition-all">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-foreground">Source Transparency</h3>
                    <p className="text-[10px] text-muted-foreground">Show users where info came from.</p>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, showSources: !settings.showSources})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                      settings.showSources ? "bg-primary" : "bg-neutral-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      settings.showSources ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/20 rounded-2xl border border-border group hover:border-red-500/30 transition-all">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-foreground">Strict Context Mode</h3>
                    <p className="text-[10px] text-muted-foreground">Block non-knowledge base chats.</p>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, strictMode: !settings.strictMode})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      settings.strictMode ? "bg-red-500 shadow-lg shadow-red-500/20" : "bg-neutral-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      settings.strictMode ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground">Confidence Threshold</h3>
                    <span className="text-[10px] font-mono font-bold text-primary">{Math.round(settings.confidenceThreshold * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={settings.confidenceThreshold}
                    onChange={(e) => setSettings({...settings, confidenceThreshold: parseFloat(e.target.value)})}
                    className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground text-center">Lowering threshold makes AI more "talkative" but riskier.</p>
                </div>
              </div>
            </section>

            {/* Autonomous Escalation Card */}
            <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/10 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">Autonomous Escalation</h2>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-[-1rem]">Automatically create tickets and route to agents based on AI detection.</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent/20 rounded-2xl border border-border group hover:border-red-500/30 transition-all">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-foreground">Escalate on Frustration</h3>
                    <p className="text-[10px] text-muted-foreground">Creates ticket if negative sentiment is detected.</p>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, escalateOnSentiment: !settings.escalateOnSentiment})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                      settings.escalateOnSentiment ? "bg-red-500 shadow-lg shadow-red-500/20" : "bg-neutral-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      settings.escalateOnSentiment ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/20 rounded-2xl border border-border group hover:border-primary/30 transition-all">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-foreground">Escalate on Handoff Intent</h3>
                    <p className="text-[10px] text-muted-foreground">Triggers when user asks for a "real person".</p>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, escalateOnHandoff: !settings.escalateOnHandoff})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                      settings.escalateOnHandoff ? "bg-primary shadow-lg shadow-primary/20" : "bg-neutral-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      settings.escalateOnHandoff ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/20 rounded-2xl border border-border group hover:border-yellow-500/30 transition-all">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-foreground">Escalate on KB Miss</h3>
                    <p className="text-[10px] text-muted-foreground">Creates ticket if the AI doesn't know the answer.</p>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, escalateOnKBMiss: !settings.escalateOnKBMiss})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                      settings.escalateOnKBMiss ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : "bg-neutral-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      settings.escalateOnKBMiss ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">High-Risk Keywords</label>
                  <input 
                    type="text" 
                    value={settings.highRiskKeywords}
                    onChange={(e) => setSettings({...settings, highRiskKeywords: e.target.value})}
                    placeholder="e.g. refund, lawyer, cancel"
                    className="w-full bg-accent/30 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-inner"
                  />
                  <p className="text-[10px] text-muted-foreground ml-1">Comma-separated words that instantly trigger a ticket.</p>
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
              className="w-full bg-accent/50 border border-border hover:border-primary/50 py-6 rounded-[2.5rem] group flex flex-col items-center gap-2 transition-all active:scale-[0.98]"
            >
              <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-black text-foreground tracking-tight">Open Playground</span>
              <p className="text-xs text-muted-foreground">Test your behavior rules live</p>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
