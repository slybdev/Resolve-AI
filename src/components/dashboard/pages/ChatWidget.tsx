import React, { useState } from 'react';
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
  const { toast } = useToast();

  React.useEffect(() => {
    // Fetch current config using the API client
    api.widget.getConfig(workspaceId)
      .then(data => {
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.settings?.title) setTitle(data.settings.title);
        if (data.settings?.welcome_message) setWelcomeMessage(data.settings.welcome_message);
        if (data.theme) setTheme(data.theme);
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
        }
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
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
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
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-bold transition-all btn-press",
                        theme === 'light' ? "bg-primary/10 border border-primary/50 text-primary" : "bg-accent/50 border border-border text-foreground hover:bg-accent"
                      )}
                    >
                      Light
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-bold transition-all btn-press",
                        theme === 'dark' ? "bg-primary/10 border border-primary/50 text-primary" : "bg-accent/50 border border-border text-foreground hover:bg-accent"
                      )}
                    >
                      Dark
                    </button>
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
              
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Production Snippet</h3>
                    <span className="px-2 py-1 bg-green-500/10 text-[10px] font-bold text-green-500 rounded-md">CDN</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Copy and paste this snippet before the &lt;/body&gt; tag of your production site.</p>
                  <div className="relative">
                    <pre className="p-4 bg-accent/50 border border-border rounded-xl text-[10px] font-mono text-primary overflow-x-auto">
{`<script 
  src="${window.location.origin}/widget.js" 
  data-xentraldesk-id="${workspaceId}" 
  data-color="${primaryColor}"
  data-title="${title}"
  data-theme="${theme}"
></script>`}
                    </pre>
                    <button 
                      onClick={() => {
                        const snippet = `<script src="${window.location.origin}/widget.js" data-xentraldesk-id="${workspaceId}" data-color="${primaryColor}" data-title="${title}" data-theme="${theme}"></script>`;
                        navigator.clipboard.writeText(snippet);
                        toast('Copied!', 'Production snippet copied to clipboard.', 'success');
                      }}
                      className="absolute top-2 right-2 p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors btn-press"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm border-dashed">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Local Development</h3>
                    <span className="px-2 py-1 bg-primary/10 text-[10px] font-bold text-primary rounded-md">DEV</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Use this snippet to test the widget locally on your development machine.</p>
                  <div className="relative">
                    <pre className="p-4 bg-accent/50 border border-border rounded-xl text-[10px] font-mono text-foreground/50 overflow-x-auto">
{`<script>
  window.XENTRALDESK_WORKSPACE_ID = "${workspaceId}";
  window.XENTRALDESK_COLOR = "${primaryColor}";
  window.XENTRALDESK_TITLE = "${title}";
  window.XENTRALDESK_THEME = "${theme}";
</script>
<script type="module" src="${window.location.origin}/src/widget/main.tsx"></script>`}
                    </pre>
                    <button 
                      onClick={() => {
                        const snippet = `<script>\n  window.XENTRALDESK_WORKSPACE_ID = "${workspaceId}";\n  window.XENTRALDESK_COLOR = "${primaryColor}";\n  window.XENTRALDESK_TITLE = "${title}";\n  window.XENTRALDESK_THEME = "${theme}";\n</script>\n<script type="module" src="${window.location.origin}/src/widget/main.tsx"></script>`;
                        navigator.clipboard.writeText(snippet);
                        toast('Copied!', 'Development snippet copied to clipboard.', 'info');
                      }}
                      className="absolute top-2 right-2 p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors btn-press"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                  </div>
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

          {/* Real Widget Preview */}
          <div className="absolute bottom-6 right-6 scale-[0.8] origin-bottom-right">
            <ChatWidgetPublic 
              workspaceId={workspaceId}
              primaryColor={primaryColor}
              title={title}
              welcomeMessage={welcomeMessage}
              theme={theme as 'light' | 'dark'}
              isPreview={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
