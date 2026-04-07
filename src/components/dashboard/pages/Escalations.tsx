import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { 
  ShieldCheck, 
  MessageSquare, 
  AlertCircle, 
  Bell, 
  Mail, 
  Slack, 
  Send, 
  Smartphone,
  Plus,
  Trash2,
  Settings,
  ChevronRight, 
  CheckCircle2, 
  Terminal, 
  Hash, 
  User, 
  X, 
  Sparkles, 
  Wand2, 
  Loader2,
  Clock,
  UserCheck,
  ShieldAlert,
  Save
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EscalationRule {
  id: string;
  name: string;
  type: 'sla' | 'frustration' | 'manual';
  conditions: any;
  action_type: string;
  is_active: boolean;
  priority: number;
}

export const Escalations = ({ workspaceId }: { workspaceId: string }) => {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger_type: 'frustration',
    keywords: [] as string[],
    threshold_minutes: 30,
    ai_frustration_enabled: true,
    frustration_sensitivity: 0.7,
    action_priority: 'high',
    action_assign_team: ''
  });
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const fetchRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.automations.escalations.list(workspaceId);
      setRules(data);
    } catch (error: any) {
      toast("Error", "Failed to fetch escalation rules", "error");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, toast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreateRule = async () => {
    if (!newRule.name) {
       toast("Validation Error", "Please provide a name.", "error");
       return;
    }
    
    try {
      const payload = {
        ...newRule,
        ai_frustration_enabled: newRule.trigger_type === 'frustration',
        action_assign_team: newRule.action_assign_team || null
      };

      if (editingRuleId) {
        await api.automations.escalations.update(editingRuleId, payload);
        toast("Success", "Escalation rule updated", "success");
      } else {
        await api.automations.escalations.create(workspaceId, payload);
        toast("Success", "Escalation rule created", "success");
      }
      setIsModalOpen(false);
      setEditingRuleId(null);
      setNewRule({
        name: '',
        trigger_type: 'frustration',
        keywords: [],
        threshold_minutes: 30,
        ai_frustration_enabled: true,
        frustration_sensitivity: 0.7,
        action_priority: 'high',
        action_assign_team: ''
      });
      fetchRules();
    } catch (error: any) {
      toast("Error", "Failed to save rule", "error");
    }
  };

  const startEdit = (rule: EscalationRule) => {
    setNewRule({
      name: rule.name,
      trigger_type: rule.type || 'frustration', // Handle mapping from backend
      keywords: (rule as any).keywords || [],
      threshold_minutes: (rule as any).threshold_minutes || 30,
      ai_frustration_enabled: (rule as any).ai_frustration_enabled || false,
      frustration_sensitivity: (rule as any).frustration_sensitivity || 0.7,
      action_priority: (rule as any).action_priority || 'high',
      action_assign_team: (rule as any).action_assign_team || ''
    });
    setEditingRuleId(rule.id);
    setIsModalOpen(true);
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.automations.escalations.delete(id);
      fetchRules();
    } catch (error: any) {
      toast("Error", "Failed to delete rule", "error");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden gap-2 p-2">
      <div className="flex-1 overflow-y-auto no-scrollbar bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="max-w-5xl w-full mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Escalation Controls</h1>
            <p className="text-muted-foreground mt-1">Manage SLA breach detection and AI-powered frustration monitoring.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20 btn-press"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        {/* Predictive AI Banner */}
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-3xl p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
               <Sparkles className="w-6 h-6 text-white" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-foreground">Predictive Frustration Detection</h3>
               <p className="text-xs text-muted-foreground max-w-md">Our AI analyzes sentiment patterns to predict customer frustration before they even ask for an agent.</p>
             </div>
          </div>
          <div className="flex items-center bg-white/5 border border-purple-500/20 p-1 rounded-xl">
             <span className="px-3 py-1 text-[10px] font-bold text-purple-600">ENABLED</span>
          </div>
        </div>

        {/* Rules Grid */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Escalation Rules</h2>
          </div>
          
          <div className="grid gap-4">
            {isLoading ? (
              <div className="py-20 text-center"><Spinner /></div>
            ) : rules.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
                <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-xs text-muted-foreground font-medium">No escalation rules found. Create one to get started.</p>
              </div>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className="bg-card border border-border p-6 rounded-3xl flex items-center justify-between hover:border-primary/50 transition-all shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border",
                      rule.type === 'sla' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                      {rule.type === 'sla' ? <Clock className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{rule.name}</h3>
                        {!rule.is_active && <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[8px] font-bold tracking-widest">INACTIVE</span>}
                      </div>
                       <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter mt-0.5">
                         {rule.type} • { (rule as any).trigger_type === 'keyword_match' ? `KW: ${(rule as any).keywords?.join(', ')}` : rule.action_type || (rule as any).action_priority }
                       </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end mr-4">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Priority</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(p => (
                          <div key={p} className={cn("w-1.5 h-1.5 rounded-full", p <= rule.priority ? "bg-primary" : "bg-muted")} />
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => startEdit(rule)}
                      className="p-2 hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="p-2 hover:bg-red-50 rounded-xl text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Settings */}
        <div className="pt-12 border-t border-border space-y-8">
           <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Global Notification Settings</h2>
           <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Internal Slack Sync", icon: Slack, color: "text-purple-500", desc: "Push escalation alerts to team channel" },
                { label: "Direct Email Notify", icon: Mail, color: "text-blue-500", desc: "Notify supervisors on SLA breach" },
                { label: "Dashboard Toast", icon: Smartphone, color: "text-green-500", desc: "Real-time browser notifications" },
                { label: "External CRM Log", icon: MessageSquare, color: "text-zinc-500", desc: "Update ticket status in Salesforce/Hubspot" }
              ].map((channel, i) => (
                <div key={i} className="bg-card border border-border p-6 rounded-3xl flex items-center justify-between hover:border-primary/20 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-accent rounded-2xl flex items-center justify-center border border-border">
                      <channel.icon className={cn("w-5 h-5", channel.color)} />
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-foreground">{channel.label}</h3>
                       <p className="text-[10px] text-muted-foreground font-medium">{channel.desc}</p>
                    </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={i % 2 === 0} />
                    <div className="w-10 h-5 bg-muted border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:border-primary"></div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-12">
            <button className="px-6 py-2.5 bg-accent text-foreground border border-border rounded-xl text-xs font-bold hover:opacity-80 transition-all btn-press">
              Reset Constants
            </button>
            <button className="flex items-center gap-2 px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:opacity-90 transition-all btn-press">
              <Save className="w-3.5 h-3.5" />
              Sync Escalation Mesh
            </button>
        </div>
      </div>
      </div>

      {/* Create Rule Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card border border-border w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
               <div className="p-8 border-b border-border flex items-center justify-between bg-accent/30">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      {editingRuleId ? <Settings className="w-6 h-6 text-primary" /> : <ShieldAlert className="w-6 h-6 text-primary" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{editingRuleId ? 'Edit Escalation Rule' : 'New Escalation Rule'}</h2>
                      <p className="text-xs text-muted-foreground">{editingRuleId ? 'Modify your existing escalation threshold.' : 'Define logic for message escalations.'}</p>
                    </div>
                 </div>
                 <button onClick={() => { setIsModalOpen(false); setEditingRuleId(null); }} className="p-2 hover:bg-accent rounded-full"><X className="w-5 h-5"/></button>
               </div>

               <div className="p-8 space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Rule Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-accent/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={newRule.name}
                      onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                      placeholder="e.g. Angry Customer High Priority"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Type</label>
                        <select 
                          className="w-full bg-accent/30 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none appearance-none font-bold"
                          value={newRule.trigger_type}
                          onChange={(e) => setNewRule({...newRule, trigger_type: e.target.value as any})}
                        >
                          <option value="frustration">Frustration Detection (AI)</option>
                          <option value="keyword_match">Keyword Match</option>
                          <option value="sla_breach">SLA Deadline</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Action Priority</label>
                        <select 
                          className="w-full bg-accent/30 border border-border rounded-xl px-4 py-3 text-xs focus:outline-none appearance-none font-bold text-primary"
                          value={newRule.action_priority}
                          onChange={(e) => setNewRule({...newRule, action_priority: e.target.value})}
                        >
                          <option value="urgent">Mark as Urgent</option>
                          <option value="high">Set Priority: High</option>
                          <option value="medium">Set Priority: Medium</option>
                        </select>
                      </div>
                    </div>

                  {newRule.trigger_type === 'keyword_match' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                       <label className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">Trigger Keywords (Enter to add)</label>
                       <div className="flex flex-wrap gap-2 p-3 bg-accent/10 border border-primary/20 rounded-2xl min-h-[50px]">
                          {newRule.keywords.map((kw, i) => (
                            <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold border border-primary/20 animate-in zoom-in-75">
                              {kw}
                              <button onClick={() => setNewRule({...newRule, keywords: newRule.keywords.filter((_, idx) => idx !== i)})} className="hover:text-red-500 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            className="bg-transparent border-none focus:ring-0 text-sm flex-1 min-w-[120px] ml-1"
                            placeholder="Type keyword and press Enter..."
                            value={currentKeyword}
                            onChange={(e) => setCurrentKeyword(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (currentKeyword.trim()) {
                                  setNewRule({...newRule, keywords: [...newRule.keywords, currentKeyword.trim()]});
                                  setCurrentKeyword('');
                                }
                              }
                            }}
                          />
                       </div>
                    </motion.div>
                  )}

                   <div className={cn(
                     "flex items-center justify-between p-5 border rounded-2xl transition-all",
                     newRule.trigger_type === 'frustration' ? "bg-purple-500/5 border-purple-500/20" : "opacity-30 pointer-events-none grayscale"
                   )}>
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">AI Predictive Monitoring</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">Auto-trigger on frustration patterns</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setNewRule({...newRule, ai_frustration_enabled: !newRule.ai_frustration_enabled})}
                        className={cn(
                          "w-10 h-5 rounded-full relative border transition-all",
                          newRule.ai_frustration_enabled ? "bg-purple-500 border-purple-600" : "bg-muted border-border"
                        )}
                      >
                        <div className={cn("absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all", newRule.ai_frustration_enabled ? "right-1" : "left-1")}/>
                      </button>
                   </div>
               </div>

               <div className="p-8 border-t border-border bg-accent/30 flex justify-end gap-3">
                 <button onClick={() => { setIsModalOpen(false); setEditingRuleId(null); }} className="px-6 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground">Cancel</button>
                 <button onClick={handleCreateRule} className="px-10 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:opacity-90">
                   {editingRuleId ? 'Save Changes' : 'Create Rule'}
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
