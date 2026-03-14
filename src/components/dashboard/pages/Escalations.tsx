import React, { useState } from 'react';
import { ShieldCheck, MessageSquare, AlertCircle, Bell, Mail, Slack, Send, Smartphone } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const Escalations = () => {
  const [threshold, setThreshold] = useState(70);

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-4xl w-full mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Escalation Settings</h1>
          <p className="text-muted-foreground">Configure when and how AI escalates to human agents.</p>
        </div>

        {/* Escalation Triggers */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Escalation Triggers</h2>
          </div>
          
          <div className="grid gap-4">
            <div className="bg-card border border-border p-6 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">AI Confidence Threshold</h3>
                  <p className="text-xs text-muted-foreground">Escalate when AI confidence is below {threshold}%</p>
                </div>
                <span className="text-lg font-mono font-bold text-primary">{threshold}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={threshold} 
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {[
              { label: "User requests human agent", description: "Escalate immediately when keywords like 'human' or 'agent' are detected.", icon: MessageSquare },
              { label: "Message count limit", description: "Escalate after 5 messages without resolution.", icon: AlertCircle },
              { label: "Negative sentiment", description: "Escalate when user sentiment becomes consistently negative.", icon: ShieldCheck }
            ].map((trigger, i) => (
              <div key={i} className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center border border-border">
                    <trigger.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{trigger.label}</h3>
                    <p className="text-xs text-muted-foreground">{trigger.description}</p>
                  </div>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={i === 0} />
                  <div className="w-11 h-6 bg-accent peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Options */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Notification Channels</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Email", icon: Mail, color: "text-blue-500" },
              { label: "Slack", icon: Slack, color: "text-purple-500" },
              { label: "Telegram", icon: Send, color: "text-blue-600" },
              { label: "Dashboard Alert", icon: Smartphone, color: "text-green-600" }
            ].map((channel, i) => (
              <div key={i} className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between hover:border-primary/20 transition-all cursor-pointer shadow-sm group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center border border-border group-hover:bg-accent/80 transition-all">
                    <channel.icon className={cn("w-5 h-5", channel.color)} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{channel.label}</h3>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={i === 1 || i === 3} />
                  <div className="w-11 h-6 bg-accent peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-border flex justify-end gap-4">
          <button className="px-6 py-3 bg-accent text-foreground border border-border rounded-xl text-sm font-bold hover:bg-accent/80 transition-colors btn-press">
            Discard Changes
          </button>
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-colors btn-press shadow-lg shadow-primary/20">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
