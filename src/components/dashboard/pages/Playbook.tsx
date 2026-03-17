import React, { useState } from 'react';
import { 
  ShieldAlert, 
  MessageSquare, 
  Users, 
  Book, 
  Plus, 
  ChevronRight,
  AlertCircle,
  Info,
  Terminal,
  X,
  CheckCircle2,
  Save
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Directive {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const directives: Directive[] = [
  {
    id: 'terminology',
    title: 'Terminology & Brand Voice',
    description: 'Define specific terms to use or avoid, and set the overall tone of communication.',
    icon: Book,
    color: 'text-blue-500 bg-blue-500/10'
  },
  {
    id: 'escalation',
    title: 'Escalation Triggers',
    description: 'Specify exactly when the AI should hand over a conversation to a human teammate.',
    icon: Users,
    color: 'text-orange-500 bg-orange-500/10'
  },
  {
    id: 'info-gathering',
    title: 'Information Gathering',
    description: 'List the essential details the AI must collect before resolving or escalating.',
    icon: MessageSquare,
    color: 'text-purple-500 bg-purple-500/10'
  },
  {
    id: 'sensitive',
    title: 'Sensitive Situations',
    description: 'Guidelines for handling frustrated customers, privacy issues, or complex complaints.',
    icon: ShieldAlert,
    color: 'text-red-500 bg-red-500/10'
  }
];

const playbookTemplates = [
  {
    title: "E-commerce Support",
    description: "Optimized for handling orders, returns, and product inquiries.",
    rules: ["Always ask for Order ID", "Offer 10% discount for delays", "Escalate if item is damaged"]
  },
  {
    title: "SaaS Tech Support",
    description: "Best for software products, bug reports, and feature requests.",
    rules: ["Ask for browser version", "Check if user is on latest version", "Escalate critical bugs immediately"]
  },
  {
    title: "Real Estate Concierge",
    description: "Tailored for property management and lead qualification.",
    rules: ["Qualify budget first", "Ask for preferred location", "Book viewing if interest is high"]
  }
];

export const Playbook = ({ workspaceId }: { workspaceId: string }) => {
  const [selectedDirective, setSelectedDirective] = useState<Directive | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    rules: ["", "", ""]
  });

  const applyTemplate = (template: typeof playbookTemplates[0]) => {
    setFormState({
      title: template.title,
      description: template.description,
      rules: [...template.rules]
    });
    setShowTemplates(false);
  };

  const handleOpenAddModal = () => {
    setFormState({ title: "", description: "", rules: ["", "", ""] });
    setIsAddModalOpen(true);
    setShowTemplates(false);
  };

  const handleOpenEditModal = (directive: Directive) => {
    setFormState({
      title: directive.title,
      description: directive.description,
      rules: ["Always maintain brand voice", "Be concise and helpful", "Follow security protocols"]
    });
    setSelectedDirective(directive);
    setShowTemplates(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Behavioral Playbook</h2>
          <p className="text-sm text-muted-foreground">Define how your AI agent interacts and handles complex scenarios.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add Directive
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {directives.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleOpenEditModal(item)}
            className="bg-card border border-border p-6 rounded-3xl hover:border-primary/50 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest px-2 py-1 bg-primary/10 rounded-md">
                Active
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Last updated 2 days ago
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {(selectedDirective || isAddModalOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setSelectedDirective(null);
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
                    selectedDirective ? selectedDirective.color : "bg-primary/10 text-primary"
                  )}>
                    {selectedDirective ? <selectedDirective.icon className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedDirective ? selectedDirective.title : "New Directive"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedDirective ? "Edit behavioral rules" : "Define a new AI behavior"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedDirective(null);
                    setIsAddModalOpen(false);
                  }}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {!selectedDirective && (
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

                {showTemplates && !selectedDirective && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="grid gap-2 overflow-hidden"
                  >
                    {playbookTemplates.map((template) => (
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
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Title</label>
                  <input 
                    type="text" 
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    placeholder="e.g. Technical Tone"
                    className="w-full bg-accent/50 border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    rows={3}
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder="Describe how the AI should behave in this scenario..."
                    className="w-full bg-accent/50 border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Specific Rules</label>
                  <div className="space-y-2">
                    {formState.rules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-accent/30 border border-border rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <input 
                          type="text" 
                          value={rule}
                          onChange={(e) => {
                            const newRules = [...formState.rules];
                            newRules[i] = e.target.value;
                            setFormState({ ...formState, rules: newRules });
                          }}
                          placeholder={`Rule #${i + 1}...`}
                          className="bg-transparent border-none p-0 text-sm w-full focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-accent/20 border-t border-border flex gap-3">
                <button 
                  onClick={() => {
                    setSelectedDirective(null);
                    setIsAddModalOpen(false);
                  }}
                  className="flex-1 py-3 px-4 bg-accent border border-border rounded-xl text-sm font-bold hover:bg-accent/80 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setSelectedDirective(null);
                    setIsAddModalOpen(false);
                  }}
                  className="flex-[2] py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {selectedDirective ? "Save Changes" : "Create Directive"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-accent/30 border border-border rounded-3xl p-8 flex items-start gap-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Info className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">Pro Tip: Contextual Guidance</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The more specific you are in your Playbook, the more reliable your AI agent becomes. Use real-world examples of how you want the AI to respond in each category.
          </p>
        </div>
      </div>
    </div>
  );
};
