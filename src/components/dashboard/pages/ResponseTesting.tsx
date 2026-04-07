import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Bot, 
  User, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Search, 
  MessageSquare,
  Sparkles,
  Info,
  ChevronRight,
  History,
  Trash2,
  Send,
  Loader2,
  ExternalLink,
  BookOpen,
  ArrowUpRight,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PromptInputBox } from '../../ui/ai-prompt-box';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';

interface TestMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  confidence?: number;
  sources?: { title: string; score: number; content: string; url?: string }[];
  intent?: string;
}

export const ResponseTesting = ({ workspaceId }: { workspaceId: string }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [lastAiResponse, setLastAiResponse] = useState<TestMessage | null>(null);
  const [showSources, setShowSources] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;

    const userMsg: TestMessage = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    try {
      const response = await api.ai.query(workspaceId, content, undefined, conversationId);
      
      const aiMsg: TestMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.answer,
        confidence: response.confidence_score,
        intent: response.intent,
        sources: (response.sources || []).map((s: any) => ({
          title: s.title,
          score: s.score,
          content: s.content,
          url: s.url
        }))
      };
      
      setMessages(prev => [...prev, aiMsg]);
      setLastAiResponse(aiMsg);
    } catch (error: any) {
      toast('Error', error.message || 'AI Query failed', 'error');
      const errorMsg: TestMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I'm having trouble connecting to my knowledge core right now. Please try again."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    setMessages([]);
    setLastAiResponse(null);
    setConversationId(crypto.randomUUID());
    toast('Session Cleared', 'Conversation memory has been reset.', 'success');
  };

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden gap-6 p-6">
      
      {/* Left Panel: Chat Simulator */}
      <div className="flex-1 flex flex-col min-w-0 bg-card/40 backdrop-blur-3xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all">
        
        {/* Playground Header */}
        <div className="h-20 border-b border-border/50 flex items-center justify-between px-8 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/5">
              <Play className="w-5 h-5 text-primary fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground tracking-tight leading-none mb-1">AI Playground</h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Memory Active • {conversationId}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
              onClick={() => setShowSources(!showSources)}
              className={cn(
                "p-2.5 rounded-xl border transition-all",
                showSources ? "bg-primary/10 border-primary/20 text-primary" : "bg-neutral-900 border-white/5 text-neutral-500"
              )}
              title="Toggle Sources"
            >
              <Database className="w-4 h-4" />
            </button>
            <button 
              onClick={clearSession}
              className="p-2.5 bg-neutral-900 border border-white/5 hover:border-red-500/30 hover:bg-red-500/5 rounded-xl text-neutral-400 hover:text-red-500 transition-all active:scale-95 group"
              title="Clear Session"
            >
              <RefreshCw className={cn("w-4 h-4 transition-transform group-hover:rotate-180 duration-500", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Chat Canvas */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar scroll-smooth bg-background/50">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-6 max-w-[90%]", msg.role === 'ai' ? "ml-0" : "ml-auto flex-row-reverse")}>
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl transition-colors",
                msg.role === 'ai' ? "bg-primary/20 border border-primary/20" : "bg-muted border border-border"
              )}>
                {msg.role === 'ai' ? (
                  <Bot className="w-6 h-6 text-primary" />
                ) : (
                  <User className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <div className={cn("space-y-3", msg.role === 'user' && "text-right flex flex-col items-end")}>
                <div className={cn(
                  "p-6 rounded-3xl text-sm leading-relaxed shadow-xl border transition-all",
                  msg.role === 'ai' 
                    ? "bg-muted/50 border-border text-foreground rounded-tl-none" 
                    : "bg-primary text-primary-foreground border-primary/20 rounded-tr-none shadow-primary/10"
                )}>
                  {msg.content}
                </div>
                {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && showSources && (
                  <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                    {msg.sources.slice(0, 3).map((source, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] text-neutral-500 hover:bg-white/10 transition-colors cursor-help">
                        <BookOpen className="w-3 h-3 text-primary" />
                        <span className="font-bold truncate max-w-[120px]">{source.title}</span>
                      </div>
                    ))}
                    {msg.sources.length > 3 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] text-neutral-500">
                        <span className="font-bold">+{msg.sources.length - 3} more</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20 pointer-events-none">
              <div className="w-24 h-24 bg-primary/5 border border-primary/10 rounded-[2.5rem] flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                <Bot className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-black text-foreground tracking-tight mb-2">Knowledge Core Online</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Ask anything about your company. I'll maintain context through our conversation.</p>
            </div>
          )}

          {isLoading && (
            <div className="flex gap-6 max-w-[85%] ml-0 h-12">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-primary/20 border border-primary/20">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 px-6 bg-muted/50 border border-border rounded-full rounded-tl-none">
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>

        {/* Input Dock */}
        <div className="p-8 border-t border-border/50 bg-muted/20">
          <PromptInputBox 
            onSend={handleSend}
            placeholder={isLoading ? "Agent is retrieving knowledge..." : "Ask a test question to verify behavior rules..."}
            disabled={isLoading}
          />
          <div className="flex items-center justify-center gap-6 mt-6 opacity-30 text-[10px] font-black uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Prompt Protected</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Identity Enforced</span>
            </div>
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              <span>Memory Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Intelligence Radar */}
      <div className="w-[420px] flex flex-col shrink-0 bg-card/40 backdrop-blur-3xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all">
        <div className="h-20 border-b border-white/5 flex items-center px-8 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Intelligence Radar</h3>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          
          {/* Answer Health */}
          <section className="space-y-4">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Answer Health</label>
            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-[2rem] flex flex-col items-center text-center space-y-4 shadow-inner relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-20" />
              
               <div className="relative w-32 h-32 flex items-center justify-center">
                 {/* Confidence Ring */}
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="58" 
                      fill="transparent" 
                      stroke={
                        (lastAiResponse?.confidence || 0) > 0.8 ? "hsl(var(--primary))" : 
                        (lastAiResponse?.confidence || 0) > 0.5 ? "#f59e0b" : "#ef4444"
                      }
                      strokeWidth="12" 
                      strokeDasharray="364.4" 
                      strokeDashoffset={364.4 * (1 - (lastAiResponse?.confidence || 0))} 
                      strokeLinecap="round" 
                      className="transition-all duration-1000 ease-out"
                    />
                 </svg>
                 <div className="absolute flex flex-col items-center">
                   <span className="text-3xl font-black text-foreground">{Math.round((lastAiResponse?.confidence || 0) * 100)}%</span>
                   <span className="text-[8px] font-bold text-muted-foreground tracking-widest uppercase">Certainty</span>
                 </div>
               </div>
               
               <div>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-1",
                    (lastAiResponse?.confidence || 0) > 0.8 ? "bg-primary/10 text-primary" : 
                    (lastAiResponse?.confidence || 0) > 0.5 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {(lastAiResponse?.confidence || 0) > 0.8 ? "Verified Core" : 
                     (lastAiResponse?.confidence || 0) > 0.5 ? "Partial Match" : "Low Confidence"}
                  </div>
                  <p className="text-[10px] text-muted-foreground max-w-[200px]">Detected intent: <span className="text-foreground font-bold">{lastAiResponse?.intent || 'Undetermined'}</span></p>
               </div>
            </div>
          </section>

          {/* Evidence Trail */}
          <section className="space-y-4">
             <div className="flex items-center justify-between pl-1">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Evidence Trail</label>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  <span className="text-[8px] font-bold text-primary uppercase">Elite Retrieval</span>
                </div>
             </div>
             
             <div className="space-y-3">
              {lastAiResponse?.sources?.length ? lastAiResponse.sources.map((source, i) => (
                <div key={i} className="bg-muted/30 border border-border p-5 rounded-[1.5rem] space-y-3 shadow-md hover:border-primary/20 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="w-3.5 h-3.5 text-primary" />
                       </div>
                       <span className="text-[10px] font-black text-white truncate max-w-[140px] uppercase tracking-wider">{source.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-neutral-600">S:{source.score.toFixed(3)}</span>
                      {source.url && <a href={source.url} target="_blank" className="p-1 hover:bg-neutral-800 rounded transition-colors"><ArrowUpRight className="w-3 h-3 text-neutral-500" /></a>}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-primary/20 rounded-full" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 pl-3 italic">"{source.content}"</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center p-12 text-center text-neutral-600 border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 opacity-20" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Inquiry...</p>
                </div>
              )}
             </div>
          </section>

          {/* Persona Rules Indicator */}
          <section className="space-y-4">
             <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Active Rules</label>
             <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-[1.5rem] space-y-4">
               <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-foreground mb-1">Behavioral Alignment</h4>
                    <p className="text-[10px] text-muted-foreground leading-tight">These rules are hard-coded into the agent to prevent prompt injection and ensure brand safety.</p>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-bold text-neutral-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    IDENTITY_LOCK
                  </div>
                  <div className="px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-bold text-neutral-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    SAAS_TONE
                  </div>
               </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
};
