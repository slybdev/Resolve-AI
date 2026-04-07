import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/src/lib/api';
import { 
  Plus, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Trash2, 
  X, 
  ArrowRight,
  Bot,
  Sparkles,
  RefreshCw,
  Eye,
  Activity,
  History,
  Loader2,
  ChevronDown,
  Filter,
  GitBranch,
  MessageSquare,
  Tag as TagIcon,
  Users,
  AlertTriangle,
  XOctagon,
  Send,
  UserPlus
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/src/components/ui/Toast';

interface Automation {
  id: string;
  name: string;
  trigger: string;
  actions: { type: string; value?: string }[];
  conditions: any;
  status: 'active' | 'disabled';
  hitCount: number;
  lastTriggered: string | null;
  useAi: boolean;
  aiPrompt: string;
}

interface ConditionRow {
  field: string;
  operator: string;
  value: string;
}

interface ActionRow {
  type: string;
  value: string;
}

const CONDITION_FIELDS = [
  { value: 'message.body', label: 'Message Body' },
  { value: 'message.type', label: 'Message Type' },
  { value: 'conversation.channel', label: 'Channel' },
  { value: 'conversation.priority', label: 'Priority' },
  { value: 'conversation.status', label: 'Status' },
  { value: 'contact.name', label: 'Contact Name' },
];

const CONDITION_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'regex', label: 'Matches Regex' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'lt', label: 'Less Than' },
];

const ACTION_TYPES = [
  { value: 'add_tag', label: 'Add Tag', icon: TagIcon, color: 'blue' },
  { value: 'assign_team', label: 'Assign Team', icon: Users, color: 'purple' },
  { value: 'assign_agent', label: 'Assign Agent', icon: UserPlus, color: 'indigo' },
  { value: 'send_message', label: 'Send Message', icon: Send, color: 'green' },
  { value: 'set_priority', label: 'Set Priority', icon: AlertTriangle, color: 'orange' },
  { value: 'create_ticket', label: 'Create Ticket', icon: GitBranch, color: 'blue' },
  { value: 'close_conversation', label: 'Close Conversation', icon: XOctagon, color: 'red' },
];

const TRIGGER_TYPES = [
  { value: 'message_received', label: 'Message Received', description: 'When a customer sends a message' },
  { value: 'conversation_created', label: 'Conversation Created', description: 'When a new conversation opens' },
  { value: 'ticket_created', label: 'Ticket Created', description: 'When a ticket is created' },
];

export const AIAutomations = ({ workspaceId }: { workspaceId: string }) => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTrace, setSimulationTrace] = useState<any[]>([]);
  const [testPayload, setTestPayload] = useState('I want a refund for order #1234');
  const [isLoading, setIsLoading] = useState(true);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const { toast } = useToast();

  // Rule builder state
  const [ruleName, setRuleName] = useState('');
  const [triggerType, setTriggerType] = useState('message_received');
  const [conditionLogic, setConditionLogic] = useState<'all' | 'any'>('all');
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([{ type: 'add_tag', value: '' }]);
  const [useAiMatching, setUseAiMatching] = useState(false);
  const [aiIntentPrompt, setAiIntentPrompt] = useState('');

  const fetchAutomations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.automations.rules.list(workspaceId);
      
      const mapped: Automation[] = data.map((rule: any) => ({
        id: rule.id,
        name: rule.name,
        trigger: rule.trigger_type,
        actions: rule.actions || [],
        conditions: rule.conditions || {},
        status: rule.is_active ? 'active' : 'disabled',
        hitCount: rule.hit_count || 0,
        lastTriggered: rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleString() : 'Never',
        useAi: rule.use_ai_matching,
        aiPrompt: rule.ai_intent_prompt || ''
      }));
      
      setAutomations(mapped);
    } catch (error: any) {
      toast("Error", "Failed to fetch automation rules", "error");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, toast]);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLogsLoading(true);
      const data = await api.automations.logs.list(workspaceId);
      setLogs(data);
    } catch (error: any) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLogsLoading(false);
    }
  }, [workspaceId]);

  const fetchTeams = useCallback(async () => {
    try {
      const data = await api.team.getFunctionalTeams(workspaceId);
      setTeams(data || []);
    } catch (e) {}
  }, [workspaceId]);

  useEffect(() => {
    fetchAutomations();
    fetchLogs();
    fetchTeams();
  }, [fetchAutomations, fetchLogs, fetchTeams]);

  const resetForm = () => {
    setRuleName('');
    setTriggerType('message_received');
    setConditionLogic('all');
    setConditions([]);
    setActions([{ type: 'add_tag', value: '' }]);
    setUseAiMatching(false);
    setAiIntentPrompt('');
    setEditingRuleId(null);
  };

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      setSimulationTrace([]);
      const result = await api.automations.simulate(workspaceId, {
        message: { body: testPayload }
      });
      setSimulationTrace(result.trace);
      toast("Simulation Complete", "Checked all rules against test payload.", "success");
    } catch (error: any) {
      toast("Simulation Failed", error.message, "error");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCreateRule = async () => {
    if (!ruleName) {
      toast("Error", "Please provide a rule name", "error");
      return;
    }
    if (actions.length === 0 || !actions[0].type) {
      toast("Error", "Please add at least one action", "error");
      return;
    }

    try {
      // Build conditions object
      const conditionsObj: any = {};
      if (conditions.length > 0) {
        conditionsObj[conditionLogic] = conditions.map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value
        }));
      }

      const payload = {
        name: ruleName,
        trigger_type: triggerType,
        conditions: conditionsObj,
        actions: actions.filter(a => a.type).map(a => ({ type: a.type, value: a.value })),
        use_ai_matching: useAiMatching,
        ai_intent_prompt: aiIntentPrompt,
        is_active: true
      };

      if (editingRuleId) {
        await api.automations.rules.update(editingRuleId, payload);
        toast("Success", "Rule updated successfully", "success");
      } else {
        await api.automations.rules.create(workspaceId, payload);
        toast("Success", "Rule created successfully", "success");
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchAutomations();
    } catch (error: any) {
      toast("Error", "Failed to save rule", "error");
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await api.automations.rules.toggle(id);
      fetchAutomations();
    } catch (error: any) {
      toast("Error", "Failed to toggle status", "error");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    try {
      await api.automations.rules.delete(id);
      toast("Success", "Rule deleted", "success");
      fetchAutomations();
    } catch (error: any) {
      toast("Error", "Failed to delete rule", "error");
    }
  };

  const startEdit = (rule: Automation) => {
    setRuleName(rule.name);
    setTriggerType(rule.trigger);
    setUseAiMatching(rule.useAi);
    setAiIntentPrompt(rule.aiPrompt);
    
    // Load conditions
    if (rule.conditions?.all) {
      setConditionLogic('all');
      setConditions(rule.conditions.all.map((c: any) => ({ field: c.field, operator: c.operator, value: c.value })));
    } else if (rule.conditions?.any) {
      setConditionLogic('any');
      setConditions(rule.conditions.any.map((c: any) => ({ field: c.field, operator: c.operator, value: c.value })));
    } else {
      setConditions([]);
    }
    
    // Load actions
    if (rule.actions && rule.actions.length > 0) {
      setActions(rule.actions.map(a => ({ type: a.type, value: a.value || '' })));
    } else {
      setActions([{ type: 'add_tag', value: '' }]);
    }
    
    setEditingRuleId(rule.id);
    setIsModalOpen(true);
  };

  const addCondition = () => {
    setConditions([...conditions, { field: 'message.body', operator: 'contains', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, key: keyof ConditionRow, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [key]: value };
    setConditions(updated);
  };

  const addAction = () => {
    setActions([...actions, { type: 'add_tag', value: '' }]);
  };

  const removeAction = (index: number) => {
    if (actions.length <= 1) return;
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, key: keyof ActionRow, value: string) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [key]: value };
    setActions(updated);
  };

  const getActionLabel = (type: string) => ACTION_TYPES.find(a => a.value === type)?.label || type;
  const getConditionCount = (rule: Automation) => {
    const c = rule.conditions;
    if (c?.all) return c.all.length;
    if (c?.any) return c.any.length;
    return 0;
  };

  // Render action value input based on action type
  const renderActionValueInput = (action: ActionRow, index: number) => {
    switch (action.type) {
      case 'assign_team':
        return (
          <select
            className="flex-1 bg-accent/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 appearance-none"
            value={action.value}
            onChange={(e) => updateAction(index, 'value', e.target.value)}
          >
            <option value="">Select Team...</option>
            {teams.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        );
      case 'set_priority':
        return (
          <select
            className="flex-1 bg-accent/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 appearance-none"
            value={action.value}
            onChange={(e) => updateAction(index, 'value', e.target.value)}
          >
            <option value="">Select Priority...</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        );
      case 'send_message':
        return (
          <textarea
            className="flex-1 bg-accent/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none h-16"
            value={action.value}
            onChange={(e) => updateAction(index, 'value', e.target.value)}
            placeholder="Message to send..."
          />
        );
      case 'close_conversation':
        return (
          <span className="flex-1 text-xs text-muted-foreground italic px-3 py-2">No value needed</span>
        );
      case 'create_ticket': {
        let val: any = { title: '', team_id: '', priority: 'medium' };
        try {
          if (action.value) {
            const parsed = JSON.parse(action.value);
            if (typeof parsed === 'object') val = { ...val, ...parsed };
          }
        } catch(e) {}

        const updateJson = (key: string, v: string) => {
          const newVal = { ...val, [key]: v };
          updateAction(index, 'value', JSON.stringify(newVal));
        };

        return (
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Ticket Title (Optional)..."
              className="w-full bg-accent/50 border border-border rounded-lg px-3 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              value={val.title}
              onChange={(e) => updateJson('title', e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 bg-accent/50 border border-border rounded-lg px-3 py-1.5 text-[11px] focus:outline-none appearance-none"
                value={val.team_id}
                onChange={(e) => updateJson('team_id', e.target.value)}
              >
                <option value="">Select Team...</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                className="flex-[0.6] bg-accent/50 border border-border rounded-lg px-3 py-1.5 text-[11px] focus:outline-none appearance-none"
                value={val.priority}
                onChange={(e) => updateJson('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        );
      }
      default:
        return (
          <input
            type="text"
            className="flex-1 bg-accent/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
            value={action.value}
            onChange={(e) => updateAction(index, 'value', e.target.value)}
            placeholder={action.type === 'add_tag' ? 'Tag name (e.g. billing)' : action.type === 'assign_agent' ? 'Agent User ID' : 'Value...'}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden gap-2 p-2">
      <div className="flex-1 overflow-y-auto no-scrollbar bg-card border border-border rounded-2xl p-8 space-y-12">
        <div className="max-w-6xl w-full mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Automation Rules</h1>
            <p className="text-muted-foreground mt-1 tracking-tight">Set up conditional triggers and AI-powered classification for your messages.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTestModalOpen(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-sm font-bold text-foreground transition-all btn-press flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Simulation Trace
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>
        </div>

        {/* Automations List Section */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Automation Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Strategy</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Conditions</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Hits</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-20 text-center"><Spinner /></td></tr>
                ) : automations.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-sm text-muted-foreground">No automation rules created yet. Click "New Rule" to get started.</td></tr>
                ) : (
                  automations.map((a) => (
                    <tr key={a.id} className="border-b border-border hover:bg-accent/50 transition-all group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{a.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-tighter font-medium">{a.trigger.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getConditionCount(a) > 0 && (
                            <span className="px-2 py-0.5 bg-accent rounded text-[9px] font-bold text-muted-foreground border border-border">
                              <Filter className="w-2.5 h-2.5 inline mr-1" />{getConditionCount(a)} FILTER{getConditionCount(a) > 1 ? 'S' : ''}
                            </span>
                          )}
                          {a.useAi && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded text-[9px] font-bold border border-purple-500/20">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI
                            </span>
                          )}
                          {getConditionCount(a) === 0 && !a.useAi && (
                            <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[9px] font-bold border border-orange-500/20">CATCH ALL</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] text-muted-foreground">{getConditionCount(a)} condition{getConditionCount(a) !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {a.actions.slice(0, 2).map((act, i) => (
                            <span key={i} className="px-2 py-0.5 bg-accent rounded text-[9px] font-bold text-foreground border border-border">
                              {getActionLabel(act.type)}
                            </span>
                          ))}
                          {a.actions.length > 2 && (
                            <span className="text-[9px] text-muted-foreground">+{a.actions.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-mono font-bold text-foreground bg-accent/50 px-2 py-1 rounded-lg border border-border">
                          {a.hitCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <button 
                          onClick={() => toggleStatus(a.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all",
                            a.status === 'active' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-muted text-muted-foreground shadow-inner"
                          )}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full", a.status === 'active' ? "bg-green-500" : "bg-muted-foreground")} />
                          {a.status}
                        </button>
                      </td>
                       <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => startEdit(a)}
                             className="p-1.5 hover:bg-accent rounded-lg transition-all text-muted-foreground hover:text-foreground"
                           >
                             <Edit2 className="w-3.5 h-3.5" />
                           </button>
                           <button 
                             onClick={() => handleDeleteRule(a.id)}
                             className="p-1.5 hover:bg-red-500/10 rounded-lg transition-all text-muted-foreground hover:text-red-500"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <History className="w-3 h-3" />
              Automation Audit Trail
            </h2>
            <button onClick={fetchLogs} className="p-1 hover:bg-accent rounded-md transition-colors"><RefreshCw className="w-3.5 h-3.5 text-muted-foreground"/></button>
          </div>
          
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="px-6 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Triggered By</th>
                  <th className="px-6 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Rule</th>
                  <th className="px-6 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Result</th>
                  <th className="px-6 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-right">Trace</th>
                </tr>
              </thead>
              <tbody>
                {isLogsLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center"><Spinner /></td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="py-14 text-center text-xs text-muted-foreground">No execution history found.</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-accent/30 transition-all font-mono">
                      <td className="px-6 py-3 text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-6 py-3">
                         <span className="text-[9px] bg-accent text-foreground px-1.5 py-0.5 rounded border border-border font-bold uppercase">{log.triggered_by}</span>
                      </td>
                      <td className="px-6 py-3 text-[11px] font-bold text-foreground">
                        {automations.find(a => a.id === log.rule_id)?.name || "Workflow Step"}
                      </td>
                      <td className="px-6 py-3">
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded uppercase",
                          log.result === 'executed' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {log.result}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button className="p-1 hover:bg-primary/10 hover:text-primary rounded transition-all"><Eye className="w-3.5 h-3.5"/></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>

      {/* Simulation Trace Modal */}
      <AnimatePresence>
        {isTestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card border border-border w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Simulation & Trace Log</h2>
                  <p className="text-xs text-muted-foreground">Test how your rules would handle a specific message payload.</p>
                </div>
                <button onClick={() => setIsTestModalOpen(false)} className="p-2 hover:bg-accent rounded-full"><X className="w-5 h-5"/></button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="w-1/3 border-r border-border p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Test Message Body</label>
                    <textarea 
                      className="w-full h-48 bg-accent/50 border border-border rounded-xl p-4 text-xs font-mono resize-none focus:outline-none"
                      value={testPayload}
                      onChange={(e) => setTestPayload(e.target.value)}
                      placeholder="Type a sample customer message..."
                    />
                  </div>
                  <button 
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                    Run Full Trace
                  </button>
                </div>

                <div className="flex-1 p-8 overflow-y-auto no-scrollbar space-y-4">
                   <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Evaluation Pipeline</h3>
                   {simulationTrace.length === 0 && !isSimulating && (
                     <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                       <Bot className="w-16 h-16 mb-4" />
                       <p className="text-sm font-medium">No trace data. Start a simulation.</p>
                     </div>
                   )}
                   
                   {simulationTrace.map((entry, i) => (
                     <motion.div 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.1 }}
                        key={entry.rule_id} 
                        className={cn(
                          "border rounded-2xl p-5 space-y-4 shadow-sm",
                          entry.matched ? "bg-green-500/5 border-green-500/20" : "bg-card border-border opacity-60"
                        )}
                     >
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center border", entry.matched ? "bg-green-500 text-white border-green-600" : "bg-accent text-muted-foreground border-border")}>
                             {entry.matched ? <CheckCircle2 className="w-3.5 h-3.5"/> : <XCircle className="w-3.5 h-3.5"/>}
                           </div>
                           <h4 className="text-sm font-bold">{entry.rule_name}</h4>
                         </div>
                         <span className="text-[10px] font-mono font-bold bg-accent px-2 py-0.5 rounded border border-border">RULE_MATCH</span>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-3 bg-card border border-border rounded-xl">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Condition Gate</span>
                            <p className="text-[11px] mt-1 font-medium">{entry.matched ? "Passed ✅" : `Failed: ${entry.reason}`}</p>
                         </div>
                         <div className="p-3 bg-card border border-border rounded-xl">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">AI Matching Gate</span>
                            <p className="text-[11px] mt-1 font-medium">{entry.matched ? "Passed ✅" : "Skipped"}</p>
                         </div>
                       </div>
                       
                       {entry.matched && (
                         <div className="pt-2 border-t border-dashed border-green-500/20">
                            <span className="text-[9px] font-bold text-green-600 uppercase">Actions Pipeline</span>
                            <div className="mt-2 space-y-1">
                              {entry.actions.map((act: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-[11px] text-foreground font-medium">
                                  <ArrowRight className="w-3 h-3 text-green-500" />
                                  <span>{getActionLabel(act.type)}: {act.value || 'Default'}</span>
                                </div>
                              ))}
                            </div>
                         </div>
                       )}
                     </motion.div>
                   ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit Rule Modal — WHEN → IF → THEN Builder */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
               <div className="p-6 border-b border-border flex items-center justify-between bg-accent/30">
                 <div className="flex items-center gap-4">
                   <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                     {editingRuleId ? <Edit2 className="w-5 h-5 text-primary" /> : <GitBranch className="w-5 h-5 text-primary" />}
                   </div>
                   <div>
                     <h2 className="text-lg font-bold">{editingRuleId ? 'Edit Automation Rule' : 'New Automation Rule'}</h2>
                     <p className="text-[11px] text-muted-foreground">Define trigger, conditions, and actions.</p>
                   </div>
                 </div>
                 <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 hover:bg-accent rounded-full transition-all"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="p-6 overflow-y-auto no-scrollbar space-y-6 flex-1">
                  {/* Rule Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rule Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-accent/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      placeholder="e.g. Auto-tag billing questions"
                    />
                  </div>

                  {/* WHEN — Trigger */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">WHEN</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Trigger event</span>
                    </div>
                    <select 
                      className="w-full bg-accent/30 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none appearance-none"
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value)}
                    >
                      {TRIGGER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
                      ))}
                    </select>
                  </div>

                  {/* IF — Conditions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">IF</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Conditions (optional)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {conditions.length > 1 && (
                          <div className="flex items-center bg-accent rounded-lg border border-border overflow-hidden">
                            <button 
                              onClick={() => setConditionLogic('all')}
                              className={cn("px-2.5 py-1 text-[9px] font-bold uppercase transition-all", conditionLogic === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                            >AND</button>
                            <button 
                              onClick={() => setConditionLogic('any')}
                              className={cn("px-2.5 py-1 text-[9px] font-bold uppercase transition-all", conditionLogic === 'any' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                            >OR</button>
                          </div>
                        )}
                        <button 
                          onClick={addCondition}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Condition
                        </button>
                      </div>
                    </div>

                    {conditions.length === 0 ? (
                      <div className="p-4 border border-dashed border-border rounded-xl text-center">
                        <p className="text-[11px] text-muted-foreground">No conditions — this rule will match <strong>all</strong> events of this trigger type.</p>
                        <button onClick={addCondition} className="mt-2 text-[10px] font-bold text-primary hover:underline">+ Add a filter condition</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {conditions.map((cond, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-accent/20 border border-border rounded-xl">
                            <select 
                              className="bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-[11px] focus:outline-none appearance-none min-w-[130px]"
                              value={cond.field}
                              onChange={(e) => updateCondition(i, 'field', e.target.value)}
                            >
                              {CONDITION_FIELDS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            <select 
                              className="bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-[11px] focus:outline-none appearance-none min-w-[100px]"
                              value={cond.operator}
                              onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                            >
                              {CONDITION_OPERATORS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <input 
                              type="text"
                              className="flex-1 bg-accent/50 border border-border rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/20"
                              value={cond.value}
                              onChange={(e) => updateCondition(i, 'value', e.target.value)}
                              placeholder="Value..."
                            />
                            <button onClick={() => removeCondition(i)} className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* THEN — Actions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">THEN</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Actions to execute</span>
                      </div>
                      <button 
                        onClick={addAction}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Action
                      </button>
                    </div>

                    <div className="space-y-2">
                      {actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
                          <div className="flex items-center gap-2 min-w-[160px]">
                            <select 
                              className="bg-accent/50 border border-border rounded-lg px-2 py-2 text-[11px] focus:outline-none appearance-none w-full font-medium"
                              value={action.type}
                              onChange={(e) => updateAction(i, 'type', e.target.value)}
                            >
                              {ACTION_TYPES.map(a => (
                                <option key={a.value} value={a.value}>{a.label}</option>
                              ))}
                            </select>
                          </div>
                          {renderActionValueInput(action, i)}
                          {actions.length > 1 && (
                            <button onClick={() => removeAction(i)} className="p-1.5 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-all mt-0.5">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Enhancement */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg"><Sparkles className="w-4 h-4 text-white"/></div>
                         <div>
                           <h4 className="text-xs font-bold text-foreground">AI Matching Gate</h4>
                           <p className="text-[10px] text-muted-foreground leading-none">Use semantic intent matching instead of just keywords.</p>
                         </div>
                       </div>
                       <button 
                        onClick={() => setUseAiMatching(!useAiMatching)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-all relative border",
                          useAiMatching ? "bg-purple-500 border-purple-600" : "bg-muted border-border"
                        )}
                       >
                         <div className={cn("absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all", useAiMatching ? "right-1" : "left-1")} />
                       </button>
                    </div>
                    
                    {useAiMatching && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                         <label className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Intent Classification Prompt</label>
                         <textarea 
                            className="w-full h-20 bg-accent/10 border border-purple-500/30 rounded-xl p-4 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                            value={aiIntentPrompt}
                            onChange={(e) => setAiIntentPrompt(e.target.value)}
                            placeholder="Detect if the user is asking for a refund even if they don't use the word 'refund'..."
                         />
                      </motion.div>
                    )}
                  </div>
               </div>

               <div className="p-6 border-t border-border bg-accent/30 flex justify-end gap-3">
                 <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-6 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground">Cancel</button>
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
