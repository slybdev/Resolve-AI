import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { 
  MessageSquare, Plus, Search, Filter, MoreHorizontal, 
  Zap, Clock, Edit3, Trash2, Copy, Tag,
  ChevronRight, CheckCircle2, AlertCircle, Settings,
  Terminal, Hash, User, X, Sparkles, Wand2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface Macro {
  id: string;
  name: string;
  shortcut: string;
  body: string;
  usageCount: number;
  lastUsed: string;
  category: string;
  isShared: boolean;
  attachments: any[];
}

export const Macros = ({ workspaceId }: { workspaceId: string }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [newMacro, setNewMacro] = useState({ name: '', shortcut: '', body: '', category: 'General', is_shared: true });
  const [editingMacroId, setEditingMacroId] = useState<string | null>(null);
  const [suggestedMacros, setSuggestedMacros] = useState<Macro[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const { toast } = useToast();

  const fetchMacros = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.automations.macros.list(workspaceId);
      
      const mapped: Macro[] = data.map((m: any) => ({
        id: m.id,
        name: m.name,
        shortcut: m.shortcut,
        body: m.body,
        usageCount: m.usage_count || 0,
        lastUsed: m.last_used_at ? new Date(m.last_used_at).toLocaleDateString() : 'Never',
        category: m.category || 'General',
        isShared: m.is_shared,
        attachments: m.attachments || []
      }));
      
      setMacros(mapped);
    } catch (error: any) {
      toast("Error", "Failed to fetch macros", "error");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, toast]);

  const handleSuggestMacros = async () => {
    try {
      setIsSuggesting(true);
      const suggestions = await api.automations.macros.suggest(workspaceId, "00000000-0000-0000-0000-000000000000");
      if (suggestions.length > 0) {
        setSuggestedMacros(suggestions);
        setIsSuggestionsOpen(true);
        toast("AI Suggestions Found", `Discovered ${suggestions.length} relevant macros for this context.`, "success");
      }
    } catch (error: any) {
      toast("AI Error", "Failed to get suggestions", "error");
    } finally {
      setIsSuggesting(false);
    }
  };

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  const deleteMacro = async (id: string) => {
    if (!confirm("Are you sure you want to delete this macro?")) return;
    try {
      await api.automations.macros.delete(id);
      toast("Macro Deleted", "The macro has been removed.", "success");
      fetchMacros();
    } catch (error: any) {
      toast("Error", "Failed to delete macro", "error");
    }
  };

  const handleCreateMacro = async () => {
    if (!newMacro.name || !newMacro.shortcut || !newMacro.body) {
      toast("Validation Error", "Please fill in all fields.", "error");
      return;
    }

    try {
      if (editingMacroId) {
        await api.automations.macros.update(editingMacroId, newMacro);
        toast("Macro Updated", "The macro has been updated.", "success");
      } else {
        await api.automations.macros.create(workspaceId, newMacro);
        toast("Macro Created", "Your new macro is ready to use.", "success");
      }
      
      setIsModalOpen(false);
      setEditingMacroId(null);
      setNewMacro({ name: '', shortcut: '', body: '', category: 'General', is_shared: true });
      fetchMacros();
    } catch (error: any) {
      toast("Error", "Failed to save macro", "error");
    }
  };

  const startEdit = (macro: Macro) => {
    setNewMacro({
      name: macro.name,
      shortcut: macro.shortcut,
      body: macro.body,
      category: macro.category,
      is_shared: macro.isShared
    });
    setEditingMacroId(macro.id);
    setIsModalOpen(true);
  };

  const handleClaimSuggestion = (suggestion: Macro) => {
    setNewMacro({
      name: suggestion.name,
      shortcut: suggestion.shortcut,
      body: suggestion.body,
      category: suggestion.category,
      is_shared: true
    });
    setEditingMacroId(null);
    setIsSuggestionsOpen(false);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden gap-2 p-2">
      {/* Header */}
      <div className="p-6 border border-border flex items-center justify-between bg-card rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Macros & Snippets</h1>
            <p className="text-sm text-muted-foreground tracking-tight">Boost response speed with pre-written smart snippets.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSuggestMacros}
            disabled={isSuggesting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-600 border border-purple-500/20 rounded-xl text-sm font-bold hover:bg-purple-500/20 transition-all btn-press"
          >
            {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
            AI Suggest
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 btn-press"
          >
            <Plus className="w-4 h-4" />
            Create Macro
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 border border-border flex items-center gap-4 bg-card rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search macros by name or shortcut..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-accent/30 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {['All', 'General', 'Billing', 'Support', 'Sales'].map((cat) => (
            <button key={cat} className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
          {isLoading ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4"><Spinner /></div>
          ) : (
            macros.filter(m => 
              m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              m.shortcut.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((macro) => (
              <motion.div 
                key={macro.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-3xl p-6 hover:border-primary/50 transition-all group shadow-sm flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{macro.name}</h3>
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{macro.shortcut}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => startEdit(macro)}
                      className="p-2 hover:bg-accent rounded-lg transition-all"
                    >
                      <Edit3 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 hover:bg-accent rounded-lg transition-all"><Copy className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => deleteMacro(macro.id)} className="p-2 hover:bg-accent rounded-lg transition-all"><Trash2 className="w-4 h-4 text-red-500/70" /></button>
                  </div>
                </div>

                <div className="flex-1 bg-accent/30 border border-border rounded-2xl p-4 mb-4 font-medium text-xs leading-relaxed text-foreground/80 italic shadow-inner">
                  "{macro.body}"
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{macro.usageCount} uses</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{macro.lastUsed}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {macro.isShared && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[8px] font-bold uppercase tracking-widest">Shared</span>}
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-accent px-2 py-1 rounded-md border border-border">
                      {macro.category}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          <button 
            onClick={() => { setEditingMacroId(null); setNewMacro({ name: '', shortcut: '', body: '', category: 'General', is_shared: true }); setIsModalOpen(true); }}
            className="border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all group min-h-[220px]"
          >
            <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-all">New Macro</h3>
              <p className="text-xs text-muted-foreground">Add a standard response to your library.</p>
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 border-b border-border flex items-center justify-between bg-accent/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    {editingMacroId ? <Edit3 className="w-5 h-5 text-primary" /> : <Zap className="w-5 h-5 text-primary" />}
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{editingMacroId ? 'Edit Macro' : 'Create Macro'}</h2>
                </div>
                <button onClick={() => { setIsModalOpen(false); setEditingMacroId(null); }} className="p-2 hover:bg-accent rounded-full transition-all"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Macro Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Welcome Greeting"
                    value={newMacro.name}
                    onChange={(e) => setNewMacro({ ...newMacro, name: e.target.value })}
                    className="w-full bg-accent/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Shortcut</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">/</span>
                      <input 
                        type="text" 
                        placeholder="hi"
                        value={newMacro.shortcut.replace(/^\//, '')}
                        onChange={(e) => setNewMacro({ ...newMacro, shortcut: '/' + e.target.value.replace(/^\//, '') })}
                        className="w-full bg-accent/30 border border-border rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Category</label>
                    <select 
                      value={newMacro.category}
                      onChange={(e) => setNewMacro({ ...newMacro, category: e.target.value })}
                      className="w-full bg-accent/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none appearance-none"
                    >
                      <option>General</option>
                      <option>Billing</option>
                      <option>Support</option>
                      <option>Sales</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Body Content</label>
                  <textarea 
                    placeholder="Hello {{customer.name}}, how can we help?"
                    value={newMacro.body}
                    onChange={(e) => setNewMacro({ ...newMacro, body: e.target.value })}
                    className="w-full bg-accent/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[140px] resize-none"
                  />
                  <div className="flex items-center gap-2 px-1">
                    <Wand2 className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Supports Dynamic Variables</span>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-border flex items-center justify-end gap-3 bg-accent/30">
                <button onClick={() => { setIsModalOpen(false); setEditingMacroId(null); }} className="px-6 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={handleCreateMacro} className="px-10 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:opacity-90 transition-all">
                  {editingMacroId ? 'Save Changes' : 'Save Macro'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Suggestions Modal */}
      <AnimatePresence>
        {isSuggestionsOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-card border border-primary/20 w-full max-w-4xl rounded-[40px] shadow-2xl flex flex-col overflow-hidden">
               <div className="p-10 border-b border-border flex items-center justify-between bg-primary/5">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-lg animate-pulse"><Sparkles className="w-7 h-7 text-primary" /></div>
                    <div>
                       <h2 className="text-2xl font-black text-foreground tracking-tighter">AI-Crafted Suggestions</h2>
                       <p className="text-sm text-muted-foreground">Smart snippets optimized for your recent customer interactions.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSuggestionsOpen(false)} className="p-3 hover:bg-accent rounded-full text-muted-foreground"><X className="w-6 h-6" /></button>
               </div>

               <div className="p-10 flex-1 overflow-y-auto max-h-[60vh] no-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {suggestedMacros.map((suggestion) => (
                      <div key={suggestion.id} className="bg-accent/10 border border-border rounded-[32px] p-6 hover:border-primary/40 transition-all group flex flex-col shadow-inner">
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                               <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-widest border border-primary/20">{suggestion.category}</div>
                               <span className="text-[10px] font-mono text-muted-foreground">/{suggestion.shortcut}</span>
                            </div>
                            <Wand2 className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 group-hover:scale-125 transition-all" />
                         </div>
                         <h3 className="text-sm font-bold text-foreground mb-3">{suggestion.name}</h3>
                         <div className="flex-1 bg-card/50 border border-border rounded-2xl p-4 text-[11px] leading-relaxed text-foreground/80 italic mb-6">
                            "{suggestion.body}"
                         </div>
                         <button 
                           onClick={() => handleClaimSuggestion(suggestion)}
                           className="w-full py-3 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:opacity-90 transition-all btn-press flex items-center justify-center gap-2"
                         >
                            <Plus className="w-3.5 h-3.5" />
                            Claim Suggestion
                         </button>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="p-10 bg-accent/30 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <AlertCircle className="w-5 h-5 text-muted-foreground" />
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Suggestions are ephemeral • Claim to save permanently</p>
                  </div>
                  <button onClick={() => setIsSuggestionsOpen(false)} className="px-10 py-3 bg-accent text-foreground border border-border rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-accent/80 transition-all">Dismiss All</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
