import React, { useState } from 'react';
import { Play, Bot, User, ShieldCheck, Database, RefreshCw, MoreVertical, Search, MessageSquare } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PromptInputBox } from '../../ui/ai-prompt-box';
import { api } from '@/src/lib/api';

interface TestMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  confidence?: number;
  sources?: { title: string; score: number; content: string }[];
}

export const ResponseTesting = ({ workspaceId }: { workspaceId: string }) => {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAiResponse, setLastAiResponse] = useState<TestMessage | null>(null);
  
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages or loading state changes
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (content: string) => {
    const userMsg: TestMessage = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    try {
      const response = await api.ai.query(workspaceId, content);
      
      const aiMsg: TestMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.answer,
        confidence: response.confidence_score,
        sources: response.sources.map((s: any) => ({
          title: s.title,
          score: s.score,
          content: s.content
        }))
      };
      
      setMessages(prev => [...prev, aiMsg]);
      setLastAiResponse(aiMsg);
    } catch (error) {
      console.error("AI Query failed:", error);
      const errorMsg: TestMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I encountered an error while processing your request. Please try again."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden gap-2 p-2">
      {/* Left Panel: Chat Simulator */}
      <div className="flex-1 flex flex-col min-w-0 border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
        <div className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">AI Playground</h2>
          </div>
          <button 
            onClick={() => { setMessages([]); setLastAiResponse(null); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-accent border border-border rounded-lg text-[10px] font-bold text-foreground transition-colors btn-press"
          >
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
            Clear Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-4 max-w-[85%]", msg.role === 'ai' ? "ml-0" : "ml-auto flex-row-reverse")}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                  msg.role === 'ai' ? "bg-primary/20 border border-primary/30" : "bg-accent border border-border"
                )}>
                  {msg.role === 'ai' ? (
                    <Bot className="w-5 h-5 text-primary" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              <div className={cn("space-y-2", msg.role === 'user' && "text-right")}>
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === 'ai' ? "bg-primary/10 border border-primary/20 text-foreground rounded-tl-none" : "bg-card border border-border text-foreground rounded-tr-none"
                )}>
                  {msg.content}
                </div>
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      <span>Confidence: {Math.round(msg.confidence! * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-20">
              <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">AI Ready to Help</p>
                <p className="text-[10px] text-muted-foreground">Ask me anything about your knowledge base</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex gap-4 max-w-[85%] ml-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-primary/20 border border-primary/30">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="p-4 rounded-2xl text-sm leading-relaxed shadow-sm bg-primary/10 border border-primary/20 text-foreground rounded-tl-none flex items-center gap-1 min-w-[60px] h-[48px]">
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-0 w-0" />
        </div>

        <div className="p-8 border-t border-border">
          <PromptInputBox 
            onSend={handleSend}
            placeholder={isLoading ? "AI is thinking..." : "Type a customer question to test AI response..."}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Right Panel: Debug Info */}
      <div className="w-96 flex flex-col shrink-0 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="h-16 border-b border-border flex items-center px-6 shrink-0 bg-card">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Response Debugger</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* Confidence Score */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Confidence Score</h4>
            <div className="bg-card border border-border p-6 rounded-3xl flex flex-col items-center text-center space-y-2 shadow-sm">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="transparent" stroke="hsl(var(--accent))" strokeWidth="8" />
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    fill="transparent" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="8" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 * (1 - (lastAiResponse?.confidence || 0))} 
                    strokeLinecap="round" 
                  />
                </svg>
                <span className="absolute text-xl font-bold text-foreground">
                  {Math.round((lastAiResponse?.confidence || 0) * 100)}%
                </span>
              </div>
              <p className={cn(
                "text-xs font-bold",
                (lastAiResponse?.confidence || 0) > 0.8 ? "text-green-500" : 
                (lastAiResponse?.confidence || 0) > 0.5 ? "text-yellow-500" : "text-red-500"
              )}>
                {(lastAiResponse?.confidence || 0) > 0.8 ? "High Confidence" : 
                 (lastAiResponse?.confidence || 0) > 0.5 ? "Medium Confidence" : "Low Confidence"}
              </p>
            </div>
          </div>

          {/* Retrieved Knowledge */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Retrieved Knowledge</h4>
            <div className="space-y-3">
              {lastAiResponse?.sources?.length ? lastAiResponse.sources.map((source, i) => (
                <div key={i} className="bg-card border border-border p-4 rounded-2xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-foreground">{source.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Score: {source.score.toFixed(3)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 italic">"{source.content}"</p>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                  <Search className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-[10px]">No sources retrieved yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* System Prompt Info */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active System Prompt</h4>
            <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] text-muted-foreground leading-relaxed font-mono">
                "You are a helpful AI customer support assistant. Answer questions using the company knowledge base..."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
