import React, { useState } from 'react';
import { 
  Globe, Mail, MessageSquare, Send, Slack, Mic, 
  CheckCircle2, AlertCircle, Settings, BarChart3, 
  RefreshCw, Save, ExternalLink, ShieldCheck,
  Zap, Clock, MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface ChannelPageProps {
  type: 'website' | 'email' | 'whatsapp' | 'telegram' | 'slack' | 'voice';
  title: string;
  icon: any;
  description: string;
  workspaceId: string;
}

export const ChannelPage = ({ type, title, icon: Icon, description, workspaceId }: ChannelPageProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stats = [
    { label: 'Total Messages', value: '12,482', change: '+12%', icon: MessageSquare },
    { label: 'Avg. Response Time', value: '1.4m', change: '-15%', icon: Clock },
    { label: 'Resolution Rate', value: '94.2%', change: '+2%', icon: CheckCircle2 },
    { label: 'AI Automation', value: '88%', change: '+5%', icon: Zap },
  ];

  const [advancedSettings, setAdvancedSettings] = useState([
    { id: 'auto-reply', label: 'Auto-Reply', desc: 'Send automated confirmation when a message is received.', enabled: true },
    { id: 'sla-tracking', label: 'SLA Tracking', desc: 'Monitor and alert when response times exceed targets.', enabled: true },
    { id: 'sentiment', label: 'AI Sentiment Analysis', desc: 'Detect customer mood and prioritize frustrated users.', enabled: false },
    { id: 'handoff', label: 'Human Handoff', desc: 'Automatically escalate to human if AI confidence is low.', enabled: true },
  ]);

  const toggleSetting = (id: string) => {
    setAdvancedSettings(prev => prev.map(item => 
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));
  };

  const handleConnect = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsConnected(!isConnected);
      setIsSaving(false);
    }, 1500);
  };

  return (
    <div className="h-full w-full bg-background overflow-y-auto no-scrollbar p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
              isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              isConnected 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                : "bg-orange-500/10 text-orange-500 border-orange-500/20"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-orange-500")} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <button 
              onClick={handleConnect}
              disabled={isSaving}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all btn-press flex items-center gap-2",
                isConnected 
                  ? "bg-accent/50 text-foreground border border-border hover:bg-accent" 
                  : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
              )}
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isConnected ? 'Disconnect' : 'Connect Channel')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border p-4 rounded-2xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  stat.change.startsWith('+') ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {stat.change}
                </span>
              </div>
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Channel Configuration</h2>
              </div>

              {type === 'email' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Support Email</label>
                      <input type="email" placeholder="support@company.com" className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Sender Name</label>
                      <input type="text" placeholder="Stark Support" className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Signature</label>
                    <textarea rows={3} placeholder="Best regards, The Team" className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                  </div>
                </div>
              )}

              {type === 'whatsapp' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">WhatsApp Business Number</label>
                    <input type="text" placeholder="+1 (555) 000-0000" className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">API Key / Token</label>
                    <input type="password" value="••••••••••••••••" readOnly className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none" />
                  </div>
                </div>
              )}

              {type === 'website' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Authorized Domains</label>
                    <input type="text" placeholder="*.company.com, company.com" className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ensure your widget is only loaded on approved domains for security.
                    </p>
                  </div>
                </div>
              )}

              {(type === 'telegram' || type === 'slack') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Bot Token / Webhook URL</label>
                    <input type="text" placeholder={type === 'telegram' ? "123456789:ABCdefGHI..." : "https://hooks.slack.com/services/..."} className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    How to get your {type} credentials
                  </button>
                </div>
              )}

              {type === 'voice' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Voice Provider</label>
                      <select className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                        <option>ElevenLabs</option>
                        <option>Google Cloud TTS</option>
                        <option>Azure Voice</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Language</label>
                      <select className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                        <option>English (US)</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
                  <Save className="w-4 h-4" />
                  Save Settings
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Advanced Settings</h2>
              </div>
              <div className="space-y-4">
                {advancedSettings.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-accent/30 border border-border rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-foreground">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </div>
                    <button 
                      onClick={() => toggleSetting(item.id)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all duration-300 cursor-pointer flex items-center px-1",
                        item.enabled ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-muted"
                      )}
                    >
                      <motion.div 
                        animate={{ x: item.enabled ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-3 h-3 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                Quick Tips
              </h3>
              <ul className="space-y-3">
                {[
                  'Ensure your API keys are kept secure.',
                  'Test your connection after saving changes.',
                  'Enable auto-replies to improve customer satisfaction.',
                  'Monitor your SLA targets regularly.'
                ].map((tip, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-2 leading-relaxed">
                    <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Channel Health
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="text-emerald-500">99.9%</span>
                  </div>
                  <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[99.9%]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-muted-foreground">API Latency</span>
                    <span className="text-emerald-500">124ms</span>
                  </div>
                  <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
