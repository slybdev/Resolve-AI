import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Globe, 
  Users, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  MessageSquare, 
  GraduationCap, 
  Settings, 
  UserPlus, 
  TestTube,
  Bot,
  ChevronRight,
  Circle,
  Copy,
  Upload,
  Link as LinkIcon,
  Send,
  X,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';

interface Step {
  id: number;
  title: string;
}

const steps: Step[] = [
  { id: 1, title: 'Workspace' },
  { id: 2, title: 'AI Setup' },
  { id: 3, title: 'Checklist' }
];

export const OnboardingFlow = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [workspaceData, setWorkspaceData] = useState({
    name: '',
    website: '',
    size: '',
    useCase: ''
  });
  const [aiData, setAiData] = useState({
    name: 'XentralDesk Assistant',
    personality: 'Professional'
  });
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (currentStep === 2) {
      setIsLoading(true);
      try {
        const res = await api.onboarding.setup({
          workspace_name: workspaceData.name,
          industry: workspaceData.useCase,
          ai_agent_name: aiData.name,
          ai_tone: aiData.personality.toLowerCase()
        });
        
        // Store the real organization/workspace ID in completedTasks or a new state
        if (res.workspace?.id || res.id) {
          setCompletedTasks(prev => [...prev, `id:${res.workspace?.id || res.id}`, 'workspace_ready']);
        }
        
        setCurrentStep(3);
      } catch (err: any) {
        toast('Error', err.message || 'Failed to save onboarding data', 'error');
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/dashboard');
    }
  };

  const completeTask = (taskId: string) => {
    if (!completedTasks.includes(taskId)) {
      setCompletedTasks(prev => [...prev, taskId]);
    }
    setActiveTask(null);
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const renderTaskModal = () => {
    if (!activeTask) return null;

    const task = checklistItems.find(t => t.id === activeTask);
    if (!task) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-neutral-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", task.color)}>
                <task.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{task.title}</h2>
                <p className="text-xs text-muted-foreground">{task.description}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTask(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          <div className="p-8">
            {activeTask === 'chat' && (
              <div className="space-y-6">
                <div className="bg-white/5 rounded-xl p-4 font-mono text-xs text-neutral-400 break-all border border-white/10 relative group">
                  <code>
                    {`<script src="${import.meta.env.VITE_WIDGET_URL || 'https://cdn.xentraldesk.io/widget.js'}" data-id="${completedTasks.includes('workspace_ready') ? completedTasks.find(t => t.startsWith('id:'))?.split(':')[1] || 'PENDING' : 'XDK-' + workspaceData.name.toLowerCase().replace(/\s+/g, '-')}" async></script>`}
                  </code>
                  <button 
                    onClick={() => {
                      const snippet = `<script src="${import.meta.env.VITE_WIDGET_URL || 'https://cdn.xentraldesk.io/widget.js'}" data-id="${completedTasks.find(t => t.startsWith('id:'))?.split(':')[1] || 'XDK-' + workspaceData.name.toLowerCase().replace(/\s+/g, '-')}" async></script>`;
                      navigator.clipboard.writeText(snippet);
                      toast('Success', 'Snippet copied to clipboard', 'success');
                    }}
                    className="absolute top-2 right-2 p-2 bg-neutral-900 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Copy this snippet and paste it into your website's {`<body>`} tag.</p>
                  <div className="flex items-center gap-2 text-xs text-green-500 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Widget is ready to be deployed
                  </div>
                </div>
              </div>
            )}

            {activeTask === 'train' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex flex-col items-center justify-center gap-3 p-6 bg-accent/30 border border-border border-dashed rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all group">
                    <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-bold">Upload PDF</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-3 p-6 bg-accent/30 border border-border border-dashed rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all group">
                    <LinkIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-bold">Add URL</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Quick Import</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="https://docs.acme.com" 
                      className="flex-1 bg-accent/50 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold">Import</button>
                  </div>
                </div>
              </div>
            )}

            {activeTask === 'config' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Response Language</label>
                    <select className="w-full bg-accent/50 border border-border rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tone of Voice</label>
                    <div className="flex gap-2">
                      {['Casual', 'Formal', 'Enthusiastic'].map(t => (
                        <button key={t} className="flex-1 py-2 px-3 bg-accent/50 border border-border rounded-xl text-xs font-bold hover:border-primary/50 transition-all">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTask === 'team' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="teammate@company.com" 
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="p-3 bg-primary/10 border border-primary rounded-xl text-left">
                        <div className="text-xs font-bold text-primary">Admin</div>
                        <div className="text-[10px] text-primary/70">Full access to settings</div>
                      </button>
                      <button className="p-3 bg-accent/50 border border-border rounded-xl text-left hover:border-primary/30 transition-all">
                        <div className="text-xs font-bold text-foreground">Member</div>
                        <div className="text-[10px] text-muted-foreground">Manage conversations</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTask === 'test' && (
              <div className="space-y-4">
                <div className="bg-accent/30 border border-border rounded-2xl h-64 flex flex-col overflow-hidden">
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
                        <span className="text-sm font-black text-white">X</span>
                      </div>
                      <div className="bg-card border border-border rounded-2xl rounded-tl-none p-3 text-sm max-w-[80%]">
                        Hi! I'm {aiData.name}. How can I help you today?
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border bg-card/50 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Type a message..." 
                      className="flex-1 bg-accent/50 border border-border rounded-full px-4 py-2 text-sm focus:outline-none"
                    />
                    <button className="p-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setActiveTask(null)}
                className="flex-1 py-3 px-4 bg-accent border border-border rounded-xl text-sm font-bold hover:bg-accent/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => completeTask(activeTask)}
                className="flex-[2] py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Finish Task
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-xl"
    >
      <div className="bg-neutral-900/50 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Set up your workspace</h1>
          <p className="text-muted-foreground">This helps us personalize your AI support platform.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Acme Corp"
                value={workspaceData.name}
                onChange={e => setWorkspaceData({ ...workspaceData, name: e.target.value })}
                className="w-full bg-accent/50 border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Company Website</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="url"
                placeholder="https://acme.com"
                value={workspaceData.website}
                onChange={e => setWorkspaceData({ ...workspaceData, website: e.target.value })}
                className="w-full bg-accent/50 border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Company Size</label>
              <select
                value={workspaceData.size}
                onChange={e => setWorkspaceData({ ...workspaceData, size: e.target.value })}
                className="w-full bg-accent/50 border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="">Select size</option>
                <option value="1-10">1–10</option>
                <option value="11-50">11–50</option>
                <option value="51-200">51–200</option>
                <option value="201-1000">201–1000</option>
                <option value="1000+">1000+</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Primary Use Case</label>
              <select
                value={workspaceData.useCase}
                onChange={e => setWorkspaceData({ ...workspaceData, useCase: e.target.value })}
                className="w-full bg-accent/50 border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="">Select use case</option>
                <option value="support">Customer Support</option>
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
                <option value="automation">AI Automation</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={!workspaceData.name || !workspaceData.website}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-xl"
    >
      <div className="bg-neutral-900/50 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Configure your AI Agent</h1>
          <p className="text-muted-foreground">Give your AI a name and personality.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">AI Name</label>
            <div className="relative">
              <Bot className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="XentralDesk Assistant"
                value={aiData.name}
                onChange={e => setAiData({ ...aiData, name: e.target.value })}
                className="w-full bg-accent/50 border border-border rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Personality</label>
            <div className="grid grid-cols-2 gap-3">
              {['Professional', 'Friendly', 'Technical', 'Concise'].map(p => (
                <button
                  key={p}
                  onClick={() => setAiData({ ...aiData, personality: p })}
                  className={cn(
                    "py-3 px-4 rounded-xl border text-sm font-bold transition-all",
                    aiData.personality === p 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-accent/50 border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const checklistItems = [
    {
      id: 'chat',
      title: 'Connect Website Chat',
      description: 'Install the chat widget on your website.',
      icon: MessageSquare,
      buttonText: 'View Installation',
      color: 'bg-blue-500/10 text-blue-500'
    },
    {
      id: 'train',
      title: 'Train Your AI',
      description: 'Upload documents or add your knowledge base.',
      icon: GraduationCap,
      buttonText: 'Add Knowledge',
      color: 'bg-purple-500/10 text-purple-500'
    },
    {
      id: 'config',
      title: 'Configure AI Agent',
      description: 'Customize how your AI responds to customers.',
      icon: Settings,
      buttonText: 'Open AI Settings',
      color: 'bg-orange-500/10 text-orange-500'
    },
    {
      id: 'team',
      title: 'Invite Your Team',
      description: 'Add teammates to manage conversations.',
      icon: UserPlus,
      buttonText: 'Invite Members',
      color: 'bg-green-500/10 text-green-500'
    },
    {
      id: 'test',
      title: 'Test Your AI',
      description: 'Simulate a conversation before going live.',
      icon: TestTube,
      buttonText: 'Test AI',
      color: 'bg-pink-500/10 text-pink-500'
    }
  ];

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-3xl"
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Welcome to your AI Support Platform</h1>
        <p className="text-muted-foreground">Complete these steps to activate your AI assistant.</p>
      </div>

      <div className="grid gap-4">
        {checklistItems.map((item, index) => {
          const isCompleted = completedTasks.includes(item.id);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "bg-neutral-900/50 border border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:border-primary/30 transition-all",
                isCompleted && "bg-white/5"
              )}
            >
              <div className="flex items-center gap-5">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {item.title}
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </h3>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                    isCompleted ? "bg-green-500/10 text-green-500" : "bg-accent text-muted-foreground"
                  )}>
                    {isCompleted ? 'Completed' : 'Not Started'}
                  </span>
                </div>
                <button 
                  onClick={() => setActiveTask(item.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all btn-press",
                    isCompleted ? "bg-accent text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  {isCompleted ? 'View Task' : item.buttonText}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleNext}
          className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="dark min-h-screen bg-black flex flex-col text-white">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">
              XentralDesk
            </span>
          </div>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <span className="text-sm text-neutral-400 font-medium">
            {workspaceData.name || 'New Workspace'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              Step {currentStep} of {steps.length}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            <img src="https://i.pravatar.cc/150?u=me" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Preview (Disabled) */}
        <div className="hidden lg:flex w-64 border-r border-white/10 bg-white/5 flex-col p-4 opacity-20 pointer-events-none">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-2 w-12 bg-neutral-800 rounded" />
              <div className="space-y-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 w-full bg-white/5 rounded-lg" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-16 bg-neutral-800 rounded" />
              <div className="space-y-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 w-full bg-white/5 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 flex items-center justify-center p-8 relative overflow-hidden bg-black">
          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
          </div>

          <AnimatePresence mode="wait">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {activeTask && renderTaskModal()}
      </AnimatePresence>

      <footer className="h-12 border-t border-white/5 flex items-center justify-center px-8 bg-black/30 backdrop-blur-sm z-50">
        <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-300 cursor-default">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold tracking-widest uppercase">Powered by XentralDesk AI</span>
        </div>
      </footer>

      {/* Progress Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-white/5">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentStep / steps.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};
