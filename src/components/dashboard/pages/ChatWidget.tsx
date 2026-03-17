import React, { useState } from 'react';
import { MessageCircle, Settings, Palette, Code, Eye, Save, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const ChatWidget = ({ workspaceId }: { workspaceId: string }) => {
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [title, setTitle] = useState('Stark Support');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I help you today?');

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Left Panel: Configuration */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border p-8 overflow-y-auto no-scrollbar">
        <div className="max-w-3xl w-full mx-auto space-y-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Chat Widget</h1>
              <p className="text-muted-foreground">Customize your customer-facing chat widget.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-accent/50 text-foreground border border-border rounded-xl text-sm font-bold hover:bg-accent transition-colors btn-press">
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>

          {/* Customization Sections */}
          <div className="space-y-12">
            {/* Appearance */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Appearance</h2>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Primary Color</label>
                  <div className="flex gap-3">
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 bg-accent/50 border border-border rounded-xl cursor-pointer p-1"
                    />
                    <input 
                      type="text" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-4 py-3 bg-accent/50 border border-border rounded-xl text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Theme Mode</label>
                  <div className="flex gap-2">
                    <button className="flex-1 py-3 bg-accent/50 border border-border rounded-xl text-xs font-bold text-foreground hover:bg-accent transition-colors btn-press">Light</button>
                    <button className="flex-1 py-3 bg-primary/10 border border-primary/50 rounded-xl text-xs font-bold text-primary btn-press">Dark</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Content</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Widget Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-accent/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Welcome Message</label>
                  <textarea 
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-accent/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Installation */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Installation</h2>
              </div>
              <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
                <p className="text-xs text-muted-foreground leading-relaxed">Copy and paste this snippet before the closing &lt;/body&gt; tag of your website.</p>
                <div className="relative">
                  <pre className="p-4 bg-accent/50 border border-border rounded-xl text-[10px] font-mono text-primary overflow-x-auto">
                    {`<script src="https://cdn.stark.ai/widget.js" 
  data-id="STARK-123-ABC" 
  data-color="${primaryColor}">
</script>`}
                  </pre>
                  <button className="absolute top-2 right-2 p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors btn-press">
                    <Code className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="w-96 flex flex-col shrink-0 bg-accent/30 p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Preview</h3>
          <div className="flex items-center gap-2 p-1 bg-accent/50 rounded-lg border border-border">
            <button className="p-1.5 bg-background border border-border rounded-md text-foreground shadow-sm"><Monitor className="w-3 h-3" /></button>
            <button className="p-1.5 hover:bg-background/50 rounded-md text-muted-foreground transition-colors"><Smartphone className="w-3 h-3" /></button>
          </div>
        </div>

        <div className="flex-1 flex items-end justify-center relative">
          {/* Mock Browser Window */}
          <div className="w-full h-full border border-border rounded-t-3xl bg-card overflow-hidden shadow-2xl">
            <div className="h-6 bg-accent/50 flex items-center gap-1.5 px-3 border-b border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
            </div>
            <div className="p-4">
              <div className="w-2/3 h-2 bg-accent rounded mb-2" />
              <div className="w-1/2 h-2 bg-accent rounded" />
            </div>
          </div>

          {/* Mock Widget */}
          <div className="absolute bottom-6 right-6 w-72 h-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-border" style={{ backgroundColor: primaryColor }}>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-sm font-bold text-white">{title}</h4>
            </div>
            <div className="flex-1 p-4 space-y-4">
              <div className="bg-accent border border-border p-3 rounded-2xl rounded-tl-none text-[10px] text-foreground">
                {welcomeMessage}
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <div className="w-full h-8 bg-accent/50 border border-border rounded-xl px-3 flex items-center text-[10px] text-muted-foreground">
                Type a message...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
