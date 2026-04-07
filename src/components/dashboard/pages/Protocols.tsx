import React, { useState } from 'react';
import { 
  Zap, 
  Plus, 
  ChevronRight,
  ShieldCheck,
  GitBranch,
  Settings,
  Terminal,
  Clock,
  CheckCircle2,
  X,
  Save,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Protocol {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'active' | 'draft';
  rulesCount: number;
}

const protocols: Protocol[] = [
  {
    id: 'refunds',
    title: 'Refund Processing Protocol',
    description: 'Rules for validating refund requests and initiating the refund process.',
    icon: Zap,
    status: 'active',
    rulesCount: 5
  },
  {
    id: 'auth',
    title: 'Identity Verification',
    description: 'Strict rules for verifying user identity before accessing sensitive account data.',
    icon: ShieldCheck,
    status: 'active',
    rulesCount: 3
  },
  {
    id: 'triage',
    title: 'Automated Triage',
    description: 'Logic for categorizing incoming requests and routing them to the correct department.',
    icon: GitBranch,
    status: 'active',
    rulesCount: 8
  },
  {
    id: 'follow-up',
    title: 'Post-Resolution Follow-up',
    description: 'Rules for checking back with customers 24 hours after a resolution.',
    icon: Clock,
    status: 'draft',
    rulesCount: 2
  }
];

const protocolTemplates = [
  {
    title: "Order Cancellation",
    description: "Automate the process of cancelling an order before it ships.",
    steps: [
      { label: "Trigger", value: "Customer says 'cancel my order'" },
      { label: "Condition", value: "Order status is 'unfulfilled'" },
      { label: "Action", value: "Cancel order in Shopify and notify user" }
    ]
  },
  {
    title: "Password Reset",
    description: "Securely guide users through resetting their account password.",
    steps: [
      { label: "Trigger", value: "User asks 'how do I reset my password?'" },
      { label: "Condition", value: "User is logged out" },
      { label: "Action", value: "Send reset link to registered email" }
    ]
  },
  {
    title: "Lead Qualification",
    description: "Qualify potential sales leads based on budget and intent.",
    steps: [
      { label: "Trigger", value: "User asks about pricing or plans" },
      { label: "Condition", value: "User budget is > $1,000" },
      { label: "Action", value: "Book a meeting with a sales rep" }
    ]
  }
];

export const Protocols = ({ workspaceId }: { workspaceId: string }) => {
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    steps: [
      { label: "Trigger", value: "" },
      { label: "Condition", value: "" },
      { label: "Action", value: "" }
    ]
  });

  const applyTemplate = (template: typeof protocolTemplates[0]) => {
    setFormState({
      title: template.title,
      description: template.description,
      steps: template.steps.map(s => ({ ...s }))
    });
    setShowTemplates(false);
  };

  const handleOpenAddModal = () => {
    setFormState({
      title: "",
      description: "",
      steps: [
        { label: "Trigger", value: "" },
        { label: "Condition", value: "" },
        { label: "Action", value: "" }
      ]
    });
    setIsAddModalOpen(true);
    setShowTemplates(false);
  };

  const handleOpenEditModal = (protocol: Protocol) => {
    setFormState({
      title: protocol.title,
      description: protocol.description,
      steps: [
        { label: "Trigger", value: "When customer mentions 'refund'" },
        { label: "Condition", value: "If order is within 30 days" },
        { label: "Action", value: "Initiate refund workflow" }
      ]
    });
    setSelectedProtocol(protocol);
    setShowTemplates(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Operational Protocols</h2>
          <p className="text-sm text-muted-foreground">Define the specific rules and automated tasks your AI agent must follow.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add Protocol
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {protocols.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleOpenEditModal(item)}
            className="bg-card border border-border p-6 rounded-3xl hover:border-primary/50 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                item.status === 'active' ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-accent"
              )}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                  item.status === 'active' ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-accent"
                )}>
                  {item.status}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">{item.rulesCount} Rules Defined</span>
              </div>
              <button className="text-xs font-bold text-primary hover:underline">
                Edit Rules
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {(selectedProtocol || isAddModalOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setSelectedProtocol(null);
              setIsAddModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    selectedProtocol?.status === 'active' ? "text-green-500 bg-green-500/10" : "bg-primary/10 text-primary"
                  )}>
                    {selectedProtocol ? <selectedProtocol.icon className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedProtocol ? selectedProtocol.title : "New Protocol"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedProtocol ? "Manage automation logic" : "Define a new operational rule"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedProtocol(null);
                    setIsAddModalOpen(false);
                  }}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {!selectedProtocol && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quick Start</span>
                    <button 
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      {showTemplates ? "Hide Templates" : "Browse Templates"}
                    </button>
                  </div>
                )}

                {showTemplates && !selectedProtocol && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="grid gap-2 overflow-hidden"
                  >
                    {protocolTemplates.map((template) => (
                      <button
                        key={template.title}
                        onClick={() => applyTemplate(template)}
                        className="text-left p-3 bg-accent/30 border border-border rounded-xl hover:border-primary/50 transition-all group"
                      >
                        <div className="text-xs font-bold text-foreground group-hover:text-primary">{template.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{template.description}</div>
                      </button>
                    ))}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Protocol Name</label>
                  <input 
                    type="text" 
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    placeholder="e.g. VIP Support Escalation"
                    className="w-full bg-accent/50 border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    rows={2}
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder="What does this protocol automate?"
                    className="w-full bg-accent/50 border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Logic Steps</label>
                    <button className="text-[10px] font-bold text-primary hover:underline">Add Step</button>
                  </div>
                  <div className="space-y-3">
                    {formState.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-accent/30 border border-border rounded-xl">
                        <div className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">{step.label}</div>
                          <input 
                            type="text" 
                            value={step.value}
                            onChange={(e) => {
                              const newSteps = [...formState.steps];
                              newSteps[i].value = e.target.value;
                              setFormState({ ...formState, steps: newSteps });
                            }}
                            placeholder={`Define ${step.label.toLowerCase()}...`}
                            className="bg-transparent border-none p-0 text-sm w-full focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-accent/20 border-t border-border flex gap-3">
                <button 
                  onClick={() => {
                    setSelectedProtocol(null);
                    setIsAddModalOpen(false);
                  }}
                  className="flex-1 py-3 px-4 bg-accent border border-border rounded-xl text-sm font-bold hover:bg-accent/80 transition-colors flex items-center justify-center gap-2"
                >
                  {selectedProtocol?.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {selectedProtocol?.status === 'active' ? "Deactivate" : "Activate"}
                </button>
                <button 
                  onClick={() => {
                    setSelectedProtocol(null);
                    setIsAddModalOpen(false);
                  }}
                  className="flex-[2] py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {selectedProtocol ? "Save Changes" : "Create Protocol"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-accent/30 border border-border rounded-3xl p-8 flex items-start gap-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Terminal className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">Advanced: Logic & Rules</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Protocols allow you to set deterministic rules for your AI. This is where you can define "If-This-Then-That" logic for sensitive business processes.
          </p>
        </div>
      </div>
    </div>
  );
};
