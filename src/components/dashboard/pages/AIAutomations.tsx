import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Search, 
  ChevronDown, 
  X, 
  Info,
  ArrowRight,
  Bot,
  MessageSquare,
  AlertCircle,
  Tag as TagIcon,
  User,
  ShieldCheck,
  Clock,
  Play,
  Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { DropdownMenu } from '@/src/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/src/components/ui/Toast';

interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: 'active' | 'disabled';
  lastUpdated: string;
}

const initialAutomations: Automation[] = [
  {
    id: '1',
    name: 'Refund Request Helper',
    trigger: 'Message contains "refund"',
    action: 'Send refund policy article',
    status: 'active',
    lastUpdated: '2h ago'
  },
  {
    id: '2',
    name: 'Angry Customer Escalation',
    trigger: 'Negative sentiment detected',
    action: 'Assign to support agent',
    status: 'active',
    lastUpdated: '5h ago'
  },
  {
    id: '3',
    name: 'Sales Inquiry Tagging',
    trigger: 'Message contains "pricing"',
    action: 'Tag conversation "sales"',
    status: 'active',
    lastUpdated: '1d ago'
  }
];

const templates = [
  { id: 't1', name: 'Refund Helper', description: 'Detect refund requests and respond with policy.' },
  { id: 't2', name: 'Angry Customer Escalation', description: 'Detect negative sentiment and escalate.' },
  { id: 't3', name: 'Order Tracking Assistant', description: 'Detect order inquiries and ask for order number.' },
  { id: 't4', name: 'Sales Inquiry Tagging', description: 'Detect pricing questions and tag conversation.' },
];

export const AIAutomations = ({ workspaceId }: { workspaceId: string }) => {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(0);
    const interval = setInterval(() => {
      setSimulationStep(prev => {
        if (prev >= 4) {
          clearInterval(interval);
          toast("Simulation Complete", "The automation rule was successfully tested.", "success");
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
  };

  const handleSaveAutomation = () => {
    setIsModalOpen(false);
    toast("Automation Saved", "Your new automation rule is now active.", "success");
  };

  const toggleStatus = (id: string) => {
    setAutomations(automations.map(a => 
      a.id === id ? { ...a, status: a.status === 'active' ? 'disabled' : 'active' } : a
    ));
  };

  const deleteAutomation = (id: string) => {
    setAutomations(automations.filter(a => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden gap-2 p-2">
      <div className="flex-1 overflow-y-auto no-scrollbar bg-card border border-border rounded-2xl p-8">
        <div className="max-w-6xl w-full mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Automations</h1>
            <p className="text-muted-foreground mt-1">Create intelligent rules that enhance how the AI handles conversations.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTestModalOpen(true)}
              className="px-4 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-sm font-bold text-foreground transition-all btn-press flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Test Automation
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Create Automation
            </button>
          </div>
        </div>

        {/* Automations List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Automations</h2>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <Info className="w-3 h-3" />
              Rules are processed in order from top to bottom
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Automation Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Trigger</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Updated</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Spinner size="lg" />
                        <span className="text-xs font-medium text-muted-foreground">Loading automation rules...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {automations.map((a) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        key={a.id} 
                        className="border-b border-border hover:bg-accent transition-all group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm font-bold text-foreground">{a.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{a.trigger}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{a.action}</td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => toggleStatus(a.id)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all btn-press",
                              a.status === 'active' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-muted text-muted-foreground border border-border"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full", a.status === 'active' ? "bg-green-500" : "bg-muted-foreground")} />
                            {a.status}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{a.lastUpdated}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <DropdownMenu
                              showChevron={false}
                              align="right"
                              options={[
                                { label: "Edit", onClick: () => console.log("Edit"), Icon: <Edit2 className="w-4 h-4" /> },
                                { label: "Delete", onClick: () => deleteAutomation(a.id), Icon: <Trash2 className="w-4 h-4 text-destructive" /> },
                              ]}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </DropdownMenu>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Templates Section */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Suggested Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="bg-card border border-border p-6 rounded-3xl space-y-4 hover:border-primary/20 transition-all group flex flex-col shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center border border-border group-hover:bg-accent/80 transition-all">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground mb-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                </div>
                <button className="w-full py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-xs font-bold text-foreground transition-all btn-press">
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test Automation Modal */}
      <AnimatePresence>
        {isTestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Test Automation Simulation</h2>
                    <p className="text-xs text-muted-foreground">Simulate a scenario to test your automation rules.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsTestModalOpen(false);
                    setIsSimulating(false);
                  }}
                  className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-all btn-press"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex gap-8">
                <div className="flex-1 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Simulation Log</span>
                      {isSimulating && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 text-primary animate-spin" />
                          <span className="text-[10px] font-bold text-primary uppercase">Processing</span>
                        </div>
                      )}
                    </div>
                    <div className="h-64 bg-accent/30 border border-border rounded-2xl p-4 overflow-y-auto no-scrollbar space-y-4">
                      {!isSimulating ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                          <Zap className="w-8 h-8 text-muted-foreground opacity-20" />
                          <p className="text-xs text-muted-foreground">Click "Start Simulation" to see your automation in action.</p>
                        </div>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {simulationStep >= 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-accent/50 rounded-xl border border-border">
                              <MessageSquare className="w-4 h-4 text-primary mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-foreground">Incoming Message</p>
                                <p className="text-xs text-muted-foreground">"I would like to request a refund for my last order."</p>
                              </div>
                            </motion.div>
                          )}
                          {simulationStep >= 2 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                              <Zap className="w-4 h-4 text-primary mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-primary">Trigger Matched</p>
                                <p className="text-xs text-muted-foreground">Keyword "refund" detected in message.</p>
                              </div>
                            </motion.div>
                          )}
                          {simulationStep >= 3 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-green-500">Action Executed</p>
                                <p className="text-xs text-muted-foreground">Sent refund policy article to customer.</p>
                              </div>
                            </motion.div>
                          )}
                          {simulationStep >= 4 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                              <TagIcon className="w-4 h-4 text-blue-500 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-blue-500">Conversation Tagged</p>
                                <p className="text-xs text-muted-foreground">Added tag "refund-inquiry" to conversation.</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-48 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Automation</label>
                    <div className="p-3 bg-accent/50 border border-border rounded-xl text-xs text-foreground font-medium">
                      Refund Request Helper
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</label>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isSimulating ? "bg-green-500 animate-pulse" : "bg-gray-500"
                      )} />
                      <span className="text-xs text-foreground font-medium">
                        {isSimulating ? "Active" : "Ready"}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4">
                    {!isSimulating ? (
                      <button 
                        onClick={handleStartSimulation}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start Simulation
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsSimulating(false)}
                        className="w-full py-3 bg-accent text-foreground rounded-xl font-bold text-sm hover:bg-accent/80 transition-all btn-press border border-border flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Automation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Create New Automation</h2>
                    <p className="text-xs text-muted-foreground">Define the rules for your AI agent.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-all btn-press"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
                {/* Name Section */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Automation Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Refund Assistant"
                    className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Trigger Section */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">When should this automation run?</label>
                  <div className="relative">
                    <DropdownMenu
                      options={[
                        { label: 'Customer sends a message', onClick: () => setSelectedTrigger('msg') },
                        { label: 'Conversation created', onClick: () => setSelectedTrigger('created') },
                        { label: 'Conversation idle for X minutes', onClick: () => setSelectedTrigger('idle') },
                        { label: 'AI confidence below threshold', onClick: () => setSelectedTrigger('conf') },
                        { label: 'Negative sentiment detected', onClick: () => setSelectedTrigger('sent') },
                        { label: 'Customer requests human agent', onClick: () => setSelectedTrigger('human') },
                        { label: 'Keyword detected', onClick: () => setSelectedTrigger('keyword') },
                      ]}
                    >
                      <span className="text-sm text-foreground">
                        {selectedTrigger ? {
                          'msg': 'Customer sends a message',
                          'created': 'Conversation created',
                          'idle': 'Conversation idle for X minutes',
                          'conf': 'AI confidence below threshold',
                          'sent': 'Negative sentiment detected',
                          'human': 'Customer requests human agent',
                          'keyword': 'Keyword detected'
                        }[selectedTrigger as keyof typeof selectedTrigger] : 'Select a trigger...'}
                      </span>
                    </DropdownMenu>
                  </div>
                  
                  {selectedTrigger === 'keyword' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                      <input 
                        type="text" 
                        placeholder="refund, billing, cancel subscription"
                        className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Action Section */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">What should happen?</label>
                  <div className="relative">
                    <DropdownMenu
                      options={[
                        { label: 'Send AI generated reply', onClick: () => setSelectedAction('reply') },
                        { label: 'Send predefined message', onClick: () => setSelectedAction('predefined') },
                        { label: 'Assign conversation to agent', onClick: () => setSelectedAction('assign') },
                        { label: 'Add tag to conversation', onClick: () => setSelectedAction('tag') },
                        { label: 'Escalate to human agent', onClick: () => setSelectedAction('escalate') },
                        { label: 'Close conversation', onClick: () => setSelectedAction('close') },
                      ]}
                    >
                      <span className="text-sm text-foreground">
                        {selectedAction ? {
                          'reply': 'Send AI generated reply',
                          'predefined': 'Send predefined message',
                          'assign': 'Assign conversation to agent',
                          'tag': 'Add tag to conversation',
                          'escalate': 'Escalate to human agent',
                          'close': 'Close conversation'
                        }[selectedAction as keyof typeof selectedAction] : 'Select an action...'}
                      </span>
                    </DropdownMenu>
                  </div>

                  {selectedAction === 'reply' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Instructions for AI response</label>
                      <textarea 
                        placeholder="Respond using the refund policy knowledge base."
                        className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Status Section */}
                <div className="flex items-center justify-between p-4 bg-accent/50 border border-border rounded-2xl">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Automation Status</h4>
                    <p className="text-[10px] text-muted-foreground">Enable or disable this rule immediately.</p>
                  </div>
                  <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border flex items-center justify-end gap-3 shrink-0 bg-accent/50">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors btn-press"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveAutomation}
                  className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20"
                >
                  Save Automation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
