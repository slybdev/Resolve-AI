import React, { useState } from 'react';
import { Play, Bot, User, ShieldCheck, Database, RefreshCw, MoreVertical, Search, MessageSquare } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PromptInputBox } from '../../ui/ai-prompt-box';

interface TestMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  confidence?: number;
  sources?: string[];
}

export const ResponseTesting = ({ workspaceId }: { workspaceId: string }) => {
  const [messages, setMessages] = useState<TestMessage[]>([
    {
      id: '1',
      role: 'user',
      content: 'What is your refund policy for arc reactors?'
    },
    {
      id: '2',
      role: 'ai',
      content: 'Our refund policy for arc reactors allows for a full refund within 30 days of purchase, provided the core is still intact and has not been exposed to extreme gamma radiation.',
      confidence: 0.94,
      sources: ['Refund Policy v2.1', 'Product Manual v4']
    }
  ]);

  const handleSend = (content: string) => {
    const userMsg: TestMessage = { id: Date.now().toString(), role: 'user', content };
    setMessages([...messages, userMsg]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiMsg: TestMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I'm processing your request using the knowledge base. Based on our documents, the standard procedure is to verify the serial number first.",
        confidence: 0.88,
        sources: ['Support FAQ', 'Internal Wiki']
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Left Panel: Chat Simulator */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        <div className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-accent/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">AI Playground</h2>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-accent border border-border rounded-lg text-[10px] font-bold text-foreground transition-colors btn-press">
            <RefreshCw className="w-3 h-3" />
            Clear Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-4 max-w-[85%]", msg.role === 'ai' ? "ml-0" : "ml-auto flex-row-reverse")}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'ai' ? "bg-primary" : "bg-accent border border-border"
              )}>
                {msg.role === 'ai' ? <Bot className="w-5 h-5 text-primary-foreground" /> : <User className="w-5 h-5 text-muted-foreground" />}
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
        </div>

        <div className="p-8 border-t border-border">
          <PromptInputBox 
            onSend={handleSend}
            placeholder="Type a customer question to test AI response..."
          />
        </div>
      </div>

      {/* Right Panel: Debug Info */}
      <div className="w-96 flex flex-col shrink-0 bg-accent/10">
        <div className="h-16 border-b border-border flex items-center px-6 shrink-0">
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
                  <circle cx="48" cy="48" r="40" fill="transparent" stroke="hsl(var(--primary))" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="25.12" strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl font-bold text-foreground">94%</span>
              </div>
              <p className="text-xs text-green-500 font-bold">High Confidence</p>
            </div>
          </div>

          {/* Retrieved Knowledge */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Retrieved Knowledge</h4>
            <div className="space-y-3">
              {[
                { title: 'Refund Policy v2.1', score: 0.92, content: 'Refunds for arc reactors are processed within 30 days...' },
                { title: 'Product Manual v4', score: 0.85, content: 'Ensure the palladium core is removed before shipping...' }
              ].map((source, i) => (
                <div key={i} className="bg-card border border-border p-4 rounded-2xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-foreground">{source.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Score: {source.score}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 italic">"{source.content}"</p>
                </div>
              ))}
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
