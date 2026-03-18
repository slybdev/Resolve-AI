import React, { useState, useEffect } from 'react';
import { Layers, Slack, Mail, MessageCircle, Globe, Database, Zap, ArrowUpRight, Send, Mic, Loader2, MessageSquareDashed, Instagram, Facebook } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'connected' | 'not-connected';
  category: string;
  color: string;
}

const integrationTemplates: any[] = [
  { id: 'telegram', viewId: 'telegram', name: 'Telegram', description: 'Integrate your Telegram bot to handle customer inquiries.', icon: Send, type: 'telegram', category: 'Messaging', color: 'text-sky-400' },
  { id: 'discord', viewId: 'discord', name: 'Discord', description: 'Connect your Discord bot to support users.', icon: MessageSquareDashed, type: 'discord', category: 'Communication', color: 'text-indigo-400' },
  { id: 'slack', viewId: 'slack', name: 'Slack', description: 'Send notifications and alerts to Slack channels.', icon: Slack, type: 'slack', category: 'Communication', color: 'text-purple-400' },
  { id: 'email', viewId: 'email', name: 'Email', description: 'Sync customer emails and respond via AI.', icon: Mail, type: 'email', category: 'Email', color: 'text-red-400' },
  { id: 'whatsapp', viewId: 'whatsapp', name: 'WhatsApp', description: 'Connect your business WhatsApp account.', icon: MessageCircle, type: 'whatsapp', category: 'Messaging', color: 'text-green-400' },
  { id: 'instagram', viewId: 'instagram', name: 'Instagram', description: 'Respond to Instagram Direct messages.', icon: Instagram, type: 'instagram', category: 'Messaging', color: 'text-pink-500' },
  { id: 'facebook', viewId: 'facebook', name: 'Facebook Messenger', description: 'Chat with customers on Facebook.', icon: Facebook, type: 'facebook', category: 'Messaging', color: 'text-blue-600' },
  { id: 'website', viewId: 'website-chat', name: 'Website Chat', description: 'Embed a chat widget on your website.', icon: Globe, type: 'widget', category: 'Web', color: 'text-blue-400' },
  { id: 'voice', viewId: 'voice-ai', name: 'Voice AI', description: 'Enable AI voice interactions for your business.', icon: Mic, type: 'voice', category: 'Voice', color: 'text-orange-400' }
];

export const Integrations = ({ workspaceId, onViewChange }: { workspaceId: string, onViewChange: (view: string) => void }) => {
  const [activeChannels, setActiveChannels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChannels();
  }, [workspaceId]);

  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching channels for workspace:', workspaceId);
      const data = await api.channels.list(workspaceId);
      console.log('Channels received:', data);
      setActiveChannels(data);
    } catch (err: any) {
      console.error('Failed to fetch channels:', err);
      // Detailed error logging
      if (err.response) {
        console.error('Error response:', await err.response.text());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = (type: string) => activeChannels.some(c => c.type === type && c.is_active);

  return (
    <div className="flex flex-col h-full w-full bg-transparent p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
            <p className="text-muted-foreground">Connect your favorite tools to supercharge your AI agent.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold text-foreground">
            <Layers className="w-4 h-4 text-muted-foreground" />
            {activeChannels.filter(c => c.is_active).length} Connected
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 className="w-8 h-8 text-primary animate-spin" />
             <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Integrations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrationTemplates.map((app) => (
              <div key={app.id} className="bg-card border border-border p-6 rounded-3xl flex flex-col h-full hover:border-primary/50 transition-all group shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center">
                    <app.icon className={cn("w-6 h-6", app.color)} />
                  </div>
                  {isConnected(app.type) ? (
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20 rounded text-[10px] font-bold uppercase tracking-widest">Connected</span>
                  ) : (
                    <button 
                      onClick={() => onViewChange(app.viewId)}
                      className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 space-y-2 mb-6">
                  <h3 className="text-lg font-bold text-foreground">{app.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{app.description}</p>
                </div>

                <div className="pt-6 border-t border-border flex items-center justify-between mt-auto">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{app.category}</span>
                  <button 
                    onClick={() => onViewChange(app.viewId)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      isConnected(app.type) ? "bg-muted text-foreground border border-border" : "bg-primary text-primary-foreground hover:opacity-90"
                    )}
                  >
                    {isConnected(app.type) ? 'Configure' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
