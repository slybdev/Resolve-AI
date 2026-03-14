import React, { useState } from 'react';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, ShieldCheck, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface APIKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  status: 'active' | 'revoked';
}

const initialKeys: APIKey[] = [
  { id: '1', name: 'Production Web App', key: 'sk_live_51N...abc123', created: '2024-01-15', lastUsed: '2m ago', status: 'active' },
  { id: '2', name: 'Development Environment', key: 'sk_test_51N...xyz789', created: '2024-02-20', lastUsed: '1d ago', status: 'active' }
];

export const APIKeys = () => {
  const [keys, setKeys] = useState(initialKeys);
  const [showKey, setShowKey] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
            <p className="text-muted-foreground">Manage your API keys for programmatic access to Stark AI.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-colors">
            <Plus className="w-4 h-4" />
            Create New Key
          </button>
        </div>

        {/* Security Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-3xl flex items-start gap-4">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Security Warning</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Never share your API keys or expose them in client-side code. Use environment variables to keep them secure. If a key is compromised, revoke it immediately.
            </p>
          </div>
        </div>

        {/* API Keys List */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Key Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">API Key</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Created</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Used</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((apiKey) => (
                <tr key={apiKey.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{apiKey.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <span>{showKey === apiKey.id ? apiKey.key : '••••••••••••••••••••'}</span>
                      <button 
                        onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                        className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showKey === apiKey.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{apiKey.created}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{apiKey.lastUsed}</td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      apiKey.status === 'active' ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                    )}>
                      {apiKey.status === 'active' ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {apiKey.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* API Documentation Link */}
        <div className="bg-card border border-border p-8 rounded-3xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Developer Documentation</h3>
            <p className="text-xs text-muted-foreground">Learn how to integrate our API into your applications.</p>
          </div>
          <button className="px-6 py-3 bg-muted text-foreground border border-border rounded-xl text-xs font-bold hover:bg-accent transition-colors">
            View API Docs
          </button>
        </div>
      </div>
    </div>
  );
};
