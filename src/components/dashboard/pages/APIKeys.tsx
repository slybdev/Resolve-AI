import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, ShieldCheck, AlertCircle, Save, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { Modal } from '@/src/components/ui/Modal';
import { useToast } from '@/src/components/ui/Toast';

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

export const APIKeys = ({ workspaceId }: { workspaceId: string }) => {
  const [keys, setKeys] = useState<any[]>([]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [currentPlainKey, setCurrentPlainKey] = useState('');
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchKeys();
  }, [workspaceId]);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const data = await api.apiKeys.list(workspaceId);
      setKeys(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    try {
      const res = await api.apiKeys.create(workspaceId, newKeyName);
      setCurrentPlainKey(res.plain_key);
      setIsCreateModalOpen(false);
      setIsSuccessModalOpen(true);
      setNewKeyName('');
      fetchKeys();
      toast('Success', 'API key generated successfully', 'success');
    } catch (err: any) {
      toast('Error', err.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;

    try {
      await api.apiKeys.delete(keyToDelete);
      setKeys(keys.filter(k => k.id !== keyToDelete));
      toast('Success', 'API key revoked successfully', 'success');
      setIsDeleteModalOpen(false);
      setKeyToDelete(null);
    } catch (err: any) {
      toast('Error', err.message, 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Copied', 'API key copied to clipboard', 'info');
  };

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
            <p className="text-muted-foreground">Manage your API keys for programmatic access to Stark AI.</p>
          </div>
          <button 
            disabled={isCreating}
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Generating...' : 'Create New Key'}
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
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Loading API Keys...</div>
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground font-bold italic">
                    No API keys created yet.
                  </td>
                </tr>
              ) : keys.map((apiKey) => (
                <tr key={apiKey.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{apiKey.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <span className="w-32 truncate">{apiKey.key_prefix}••••••••••••</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-muted-foreground font-mono">
                    {new Date(apiKey.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-[11px] text-muted-foreground font-mono">
                    {apiKey.last_used_at ? new Date(apiKey.last_used_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      apiKey.is_active ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                    )}>
                      {apiKey.is_active ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {apiKey.is_active ? 'active' : 'revoked'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => copyToClipboard(apiKey.key_prefix)}
                        className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy Prefix"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setKeyToDelete(apiKey.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-600 transition-colors"
                        title="Revoke Key"
                      >
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

        {/* Modals */}
        <Modal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          title="Create New API Key"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Key Name</label>
              <input 
                type="text" 
                placeholder="e.g. Production Web App"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || isCreating}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCreating ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </Modal>

        <Modal 
          isOpen={isDeleteModalOpen} 
          onClose={() => setIsDeleteModalOpen(false)} 
          title="Revoke API Key"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <Trash2 className="w-6 h-6 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 font-medium">
                This action is irreversible. Application using this key will no longer be able to access the API.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-colors"
              >
                Keep Key
              </button>
              <button 
                onClick={handleDeleteKey}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
              >
                Revoke Key
              </button>
            </div>
          </div>
        </Modal>

        <Modal 
          isOpen={isSuccessModalOpen} 
          onClose={() => setIsSuccessModalOpen(false)} 
          title="API Key Created"
        >
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex flex-col gap-3">
              <p className="text-sm text-green-600 font-medium">
                Please copy your API key now. For security reasons, you won't be able to see it again.
              </p>
              <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/5 font-mono text-sm break-all">
                <span className="flex-1">{currentPlainKey}</span>
                <button 
                   onClick={() => copyToClipboard(currentPlainKey)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button 
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all"
            >
              I've copied the key
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};
