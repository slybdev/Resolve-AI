import React from 'react';
import { Layers, Slack, Mail, MessageCircle, Globe, Database, Zap, ArrowUpRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'connected' | 'not-connected';
  category: string;
  color: string;
}

const integrations: Integration[] = [
  { id: 'slack', name: 'Slack', description: 'Send notifications and alerts to Slack channels.', icon: Slack, status: 'connected', category: 'Communication', color: 'text-purple-400' },
  { id: 'gmail', name: 'Gmail', description: 'Sync customer emails and respond via AI.', icon: Mail, status: 'connected', category: 'Email', color: 'text-red-400' },
  { id: 'whatsapp', name: 'WhatsApp', description: 'Connect your business WhatsApp account.', icon: MessageCircle, status: 'not-connected', category: 'Messaging', color: 'text-green-400' },
  { id: 'shopify', name: 'Shopify', description: 'Access customer orders and product data.', icon: Globe, status: 'not-connected', category: 'E-commerce', color: 'text-green-500' },
  { id: 'stripe', name: 'Stripe', description: 'Manage subscriptions and billing data.', icon: Database, status: 'not-connected', category: 'Payments', color: 'text-blue-500' },
  { id: 'zapier', name: 'Zapier', description: 'Connect with 5000+ apps via Zapier.', icon: Zap, status: 'not-connected', category: 'Automation', color: 'text-orange-500' }
];

export const Integrations = () => {
  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
            <p className="text-muted-foreground">Connect your favorite tools to supercharge your AI agent.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold text-foreground">
            <Layers className="w-4 h-4 text-muted-foreground" />
            2 Connected
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((app) => (
            <div key={app.id} className="bg-card border border-border p-6 rounded-3xl flex flex-col h-full hover:border-primary/50 transition-all group shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center">
                  <app.icon className={cn("w-6 h-6", app.color)} />
                </div>
                {app.status === 'connected' ? (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20 rounded text-[10px] font-bold uppercase tracking-widest">Connected</span>
                ) : (
                  <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
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
                <button className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  app.status === 'connected' ? "bg-muted text-foreground border border-border hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/20" : "bg-primary text-primary-foreground hover:opacity-90"
                )}>
                  {app.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
