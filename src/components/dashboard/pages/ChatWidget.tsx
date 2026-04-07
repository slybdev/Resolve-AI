import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/src/lib/api';
import { MessageCircle, Settings, Palette, Code, Eye, Save, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { ChatWidgetPublic } from '@/src/components/widget/ChatWidgetPublic';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/Toast';

export const ChatWidget = ({ workspaceId }: { workspaceId: string }) => {
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [title, setTitle] = useState('XentralDesk Support');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I help you today?');
  const [theme, setTheme] = useState('dark');
  const [isSaving, setIsSaving] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const { toast } = useToast();

  const [workspaceKey, setWorkspaceKey] = useState<string | null>(null);

  React.useEffect(() => {
    // Fetch current config using the API client
    api.widget.getConfig(workspaceId)
      .then(data => {
        if (data.workspace_key) setWorkspaceKey(data.workspace_key);
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.settings?.title) setTitle(data.settings.title);
        if (data.settings?.welcome_message) setWelcomeMessage(data.settings.welcome_message);
        if (data.theme) setTheme(data.theme);
        if (data.allowed_domains) setAllowedDomains(data.allowed_domains);
      })
      .catch(err => console.error('Failed to fetch widget config:', err));
  }, [workspaceId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.widget.saveConfig(workspaceId, {
        primary_color: primaryColor,
        theme: theme,
        settings: {
          title: title,
          welcome_message: welcomeMessage
        },
        allowed_domains: allowedDomains
      });
      toast('Saved!', 'Widget configuration updated successfully.', 'success');
    } catch (error) {
      toast('Error', 'Failed to save widget configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Left Panel: Configuration */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border p-10 overflow-y-auto no-scrollbar bg-slate-50/30 dark:bg-transparent">
        <div className="max-w-4xl w-full mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-foreground tracking-tight underline decoration-primary/30 underline-offset-8">Widget Settings</h1>
              <p className="text-sm text-muted-foreground font-medium">Fine-tune the appearance and behavior of your ResolveAI assistant.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="group relative flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all btn-press shadow-xl shadow-primary/20 disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Synchronizing...' : 'Push to Production'}
              </button>
            </div>
          </div>

          {/* Customization Sections */}
          <div className="space-y-12">
            {/* Appearance Card */}
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Palette className="w-32 h-32" />
              </div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Visual Persona</h2>
                  <p className="text-xs text-muted-foreground font-medium">Define your brand's presence in the chat.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Brand Palette</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <div className="relative">
                        <input 
                          type="color" 
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-14 h-14 bg-transparent cursor-pointer rounded-2xl overflow-hidden border-none p-0"
                        />
                        <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-white/20 shadow-inner" style={{ backgroundColor: primaryColor }} />
                      </div>
                      <input 
                        type="text" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 px-5 py-3 bg-accent/30 border border-border rounded-2xl text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex gap-2.5">
                      {['#3B82F6', '#10B981', '#F43F5E', '#F59E0B', '#8B5CF6'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setPrimaryColor(color)}
                          className="w-8 h-8 rounded-full border-2 border-white/10 shadow-sm transition-transform hover:scale-110 active:scale-95"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">UI Mode</label>
                  <div className="flex bg-accent/30 p-1.5 rounded-2xl border border-border/50">
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all",
                        theme === 'light' ? "bg-white dark:bg-zinc-800 shadow-xl shadow-black/5 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Light
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all",
                        theme === 'dark' ? "bg-white dark:bg-zinc-800 shadow-xl shadow-black/5 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messaging Section Card */}
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Settings className="w-32 h-32" />
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">AI Messaging</h2>
                  <p className="text-xs text-muted-foreground font-medium">What your customers first see.</p>
                </div>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Header Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-5 py-3 bg-accent/30 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="e.g. ResolveAI Support"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Initial Greeting</label>
                    <textarea 
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      className="w-full px-5 py-4 bg-accent/30 border border-border rounded-[1.5rem] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 h-32 resize-none transition-all leading-relaxed"
                      placeholder="Enter a friendly welcome message..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Widget Security Section Card */}
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Code className="w-32 h-32" />
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                  <Code className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Widget Security</h2>
                  <p className="text-xs text-muted-foreground font-medium">Restrict where your widget can be embedded.</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Authorized Domains</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), allowedDomains.push(newDomain), setAllowedDomains([...allowedDomains]), setNewDomain(''))}
                      className="flex-1 px-5 py-3 bg-accent/30 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      placeholder="e.g. localhost:3000 or *.mysite.com"
                    />
                    <button 
                      onClick={() => {
                        if (newDomain && !allowedDomains.includes(newDomain)) {
                          setAllowedDomains([...allowedDomains, newDomain]);
                          setNewDomain('');
                        }
                      }}
                      className="px-6 py-3 bg-accent text-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-accent/80 transition-all"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {allowedDomains.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic px-1 italic">
                        No domains restricted. Currently open to all origins (not recommended for production).
                      </p>
                    ) : (
                      allowedDomains.map(domain => (
                        <div key={domain} className="group/tag flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl">
                          <span className="text-[10px] font-black font-mono text-primary uppercase tracking-tight">{domain}</span>
                          <button 
                            onClick={() => setAllowedDomains(allowedDomains.filter(d => d !== domain))}
                            className="text-primary/40 hover:text-primary transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 rotate-45" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Settings className="w-3 h-3 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-amber-600/80 font-medium leading-relaxed">
                    <strong>Note:</strong> Allowed domains verify the <code className="bg-amber-500/5 px-1 rounded">Origin</code> header. For local testing, add <code className="bg-amber-500/5 px-1 rounded">localhost:3000</code> or your actual environment URL.
                  </p>
                </div>
              </div>
            </div>

            {/* Installation Card */}
            <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                <Code className="w-32 h-32 text-white" />
              </div>
              
              <div className="flex items-center gap-3 relative z-10 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                  <Code className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Deploy Assistant</h2>
                  <p className="text-xs text-zinc-400 font-medium">Embed ResolveAI on your website.</p>
                </div>
              </div>
              
              <div className="space-y-6 relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">JS Production Snippet</label>
                    <div className="flex items-center gap-1.5 animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Cloud Distribution</span>
                    </div>
                  </div>
                  
                  <div className="relative group/code">
                    <pre className="p-6 bg-black/40 border border-white/10 rounded-3xl text-[11px] font-mono leading-relaxed text-blue-300 overflow-x-auto shadow-inner no-scrollbar">
                      {`<script>
  window.XentralDesk = {
    workspaceKey: "${workspaceKey || 'ws_live_...'}",
    primaryColor: "${primaryColor}",
    title: "${title}",
    theme: "${theme}"
  };
</script>
<script src="${import.meta.env.VITE_APP_URL || window.location.origin}/src/widget/main.tsx" type="module"></script>`}
                    </pre>
                    <button 
                      onClick={() => {
                        const snippet = `<script>\n  window.XentralDesk = {\n    workspaceKey: "${workspaceKey || 'ws_live_...'}",\n    primaryColor: "${primaryColor}",\n    title: "${title}",\n    theme: "${theme}"\n  };\n</script>\n<script src="${import.meta.env.VITE_APP_URL || window.location.origin}/src/widget/main.tsx" type="module"></script>`;
                        navigator.clipboard.writeText(snippet);
                        toast('Copied!', 'Production snippet copied and ready to deploy.', 'success');
                      }}
                      className="absolute top-4 right-4 p-3 bg-primary text-white rounded-2xl opacity-0 group-hover/code:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 backdrop-blur-md"
                    >
                      <Code className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-4 flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Eye className="w-3 h-3 text-blue-400" />
                    </div>
                    <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                      Always place the snippet just before the closing <span className="text-zinc-200">&lt;/body&gt;</span> tag for optimal performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Premium Preview */}
      <div className="w-[450px] flex flex-col shrink-0 bg-slate-100/50 dark:bg-zinc-900/30 p-10 relative overflow-hidden">
        {/* Background Decors */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />

        <div className="flex items-center justify-between mb-10 relative z-10">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Real-time Simulation</h3>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-black text-foreground">Live Assistant</span>
            </div>
          </div>
          <div className="flex bg-accent/50 p-1 rounded-xl border border-border">
            <button className="p-2 bg-background rounded-lg transition-all text-primary shadow-sm"><Monitor className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-background rounded-lg transition-all text-muted-foreground"><Smartphone className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 flex items-end justify-center relative z-10">
          {/* Enhanced Mock Browser Window */}
          <div className="w-full h-full border border-border/50 rounded-[2.5rem] bg-card overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col">
            <div className="h-10 bg-accent/40 flex items-center gap-2 px-6 border-b border-border/50 shrink-0">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/30" />
              </div>
              <div className="ml-4 flex-1 h-6 bg-white dark:bg-zinc-800 rounded-lg border border-border/50 flex items-center px-3 gap-2 grayscale">
                 <div className="w-2 h-2 rounded-full bg-zinc-300" />
                 <div className="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
              </div>
            </div>
            <div className="flex-1 p-8 space-y-6 opacity-30 grayscale transition-all select-none">
              <div className="space-y-3">
                <div className="w-2/3 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <div className="w-1/2 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
                 <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
              </div>
              <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            </div>
          </div>

          {/* Real Widget Preview with Float Animation */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute bottom-10 right-10 scale-[0.85] origin-bottom-right drop-shadow-2xl"
          >
            <ChatWidgetPublic 
              workspaceId={workspaceId}
              primaryColor={primaryColor}
              title={title}
              welcomeMessage={welcomeMessage}
              theme={theme as 'light' | 'dark'}
              isPreview={true}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
