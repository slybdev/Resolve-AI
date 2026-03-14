import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Download, 
  UserPlus, 
  Tag as TagIcon, 
  Calendar, 
  ArrowUpRight, 
  X,
  Bot,
  User,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { DropdownMenu } from '@/src/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/src/components/ui/Toast';

interface CallLog {
  id: string;
  callerName: string;
  callerNumber: string;
  company: string;
  type: 'Inbound' | 'Outbound';
  duration: string;
  status: 'Completed' | 'Missed' | 'In Progress';
  aiConfidence: number | 'N/A';
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'N/A';
  assignedAgent: string;
  timestamp: string;
}

const initialCallLogs: CallLog[] = [
  {
    id: '1',
    callerName: 'John Doe',
    callerNumber: '+1 (555) 123-4567',
    company: 'Acme Inc',
    type: 'Inbound',
    duration: '3:45',
    status: 'Completed',
    aiConfidence: 85,
    sentiment: 'Positive',
    assignedAgent: 'Unassigned',
    timestamp: '10 mins ago'
  },
  {
    id: '2',
    callerName: 'Jane Smith',
    callerNumber: '+1 (555) 987-6543',
    company: 'Beta Co',
    type: 'Outbound',
    duration: '2:10',
    status: 'In Progress',
    aiConfidence: 92,
    sentiment: 'Neutral',
    assignedAgent: 'Alice',
    timestamp: 'Just now'
  },
  {
    id: '3',
    callerName: 'Mark Lee',
    callerNumber: '+1 (555) 456-7890',
    company: 'Gamma Ltd',
    type: 'Inbound',
    duration: '0:45',
    status: 'Missed',
    aiConfidence: 'N/A',
    sentiment: 'N/A',
    assignedAgent: 'Bob',
    timestamp: '1h ago'
  }
];

const templates = [
  { id: 't1', name: 'Refund Assistant', description: 'AI explains refund policies and processes requests.' },
  { id: 't2', name: 'Order Status Helper', description: 'AI provides real-time order tracking and status info.' },
  { id: 't3', name: 'Appointment Scheduler', description: 'AI books, reschedules, or cancels appointments.' },
  { id: 't4', name: 'Follow-Up Reminder', description: 'AI reminds customers about pending tasks or invoices.' },
];

export const AICalls = () => {
  const [callLogs, setCallLogs] = useState<CallLog[]>(initialCallLogs);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [isTestCallModalOpen, setIsTestCallModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
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
          toast("Call Simulation Ended", "The AI call test was completed successfully.", "success");
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
  };

  const handleStartCall = () => {
    setIsOutboundModalOpen(false);
    toast("Call Initiated", "The AI agent is now dialing the recipient.", "info");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'In Progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Missed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getCallTypeIcon = (type: string) => {
    return type === 'Inbound' ? <PhoneIncoming className="w-3 h-3" /> : <PhoneOutgoing className="w-3 h-3" />;
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col h-full p-8 overflow-y-auto no-scrollbar transition-all duration-300",
        (selectedCall && isDetailsOpen) ? "mr-[400px]" : ""
      )}>
        <div className="max-w-6xl w-full mx-auto space-y-12">
          
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">AI Calls</h1>
              <p className="text-muted-foreground mt-1">Manage inbound and outbound AI-powered customer calls, view call logs, and assign agents.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsTestCallModalOpen(true)}
                className="px-4 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-sm font-bold text-foreground transition-all btn-press flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Test AI Call
              </button>
              <button 
                onClick={() => setIsOutboundModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20"
              >
                <PhoneCall className="w-4 h-4" />
                Start Outbound Call
              </button>
            </div>
          </div>

          {/* Call Logs Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Call Logs</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search calls..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-accent/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 w-64"
                  />
                </div>
                <button className="p-2 bg-accent/50 border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors btn-press">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Caller / Company</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duration</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Conf / Sent</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agent</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <Spinner size="lg" />
                          <span className="text-xs font-medium text-muted-foreground">Fetching call logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    callLogs.map((call) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={call.id} 
                        onClick={() => setSelectedCall(call)}
                        className={cn(
                          "border-b border-border hover:bg-accent transition-all group cursor-pointer",
                          selectedCall?.id === call.id && "bg-accent"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">{call.callerName}</span>
                            <span className="text-[10px] text-muted-foreground">{call.company} • {call.callerNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {getCallTypeIcon(call.type)}
                            {call.type}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{call.duration}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {call.status === 'In Progress' && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase border",
                              getStatusColor(call.status)
                            )}>
                              {call.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground">
                              {call.aiConfidence !== 'N/A' ? `${call.aiConfidence}%` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{call.sentiment}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{call.assignedAgent}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <DropdownMenu
                              showChevron={false}
                              align="right"
                              options={[
                                { label: "Listen Recording", onClick: () => {}, Icon: <Play className="w-4 h-4" /> },
                                { label: "View Transcript", onClick: () => setSelectedCall(call), Icon: <MessageSquare className="w-4 h-4" /> },
                                { label: "Assign Agent", onClick: () => {}, Icon: <UserPlus className="w-4 h-4" /> },
                                { label: "Escalate", onClick: () => {}, Icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
                              ]}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </DropdownMenu>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Templates Section */}
          <div className="space-y-6">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Call Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="bg-card border border-border p-6 rounded-3xl space-y-4 hover:border-primary/50 transition-all group flex flex-col shadow-sm card-hover">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center border border-border group-hover:bg-primary/10 transition-all">
                    <Phone className="w-5 h-5 text-primary" />
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
      </div>

      {/* Call Details Panel Toggle */}
      {selectedCall && (
        <button 
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className={cn(
            "fixed top-6 z-50 p-1.5 bg-accent/50 hover:bg-accent border border-border rounded-lg text-foreground transition-all duration-300 backdrop-blur-md btn-press shadow-xl",
            isDetailsOpen ? "right-[384px]" : "right-4"
          )}
        >
          {isDetailsOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      {/* Call Details Panel */}
      {selectedCall && (
        <div className={cn(
          "fixed top-0 right-0 w-[400px] h-screen bg-card border-l border-border flex flex-col transition-all duration-300 z-40 shadow-2xl",
          !isDetailsOpen && "translate-x-full"
        )}>
          <div className="p-6 border-b border-border flex items-center justify-between bg-accent/50">
            <h2 className="text-lg font-bold text-foreground">Call Details</h2>
            <button 
              onClick={() => setSelectedCall(null)}
              className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors btn-press"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
            {/* Caller Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center border border-border">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedCall.callerName}</h3>
                  <p className="text-xs text-muted-foreground">{selectedCall.company} • {selectedCall.callerNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-accent/50 rounded-2xl border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Duration</p>
                  <p className="text-sm text-foreground">{selectedCall.duration}</p>
                </div>
                <div className="p-3 bg-accent/50 rounded-2xl border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Timestamp</p>
                  <p className="text-sm text-foreground">{selectedCall.timestamp}</p>
                </div>
              </div>
            </div>

            {/* Recording Player */}
            <div className="p-4 bg-accent/50 rounded-3xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recording</span>
                <button className="text-muted-foreground hover:text-foreground transition-colors btn-press">
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background hover:opacity-90 transition-all btn-press">
                  <Play className="w-4 h-4 fill-current" />
                </button>
                <div className="flex-1 h-1 bg-border rounded-full relative">
                  <div className="absolute left-0 top-0 h-full w-1/3 bg-primary rounded-full" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">1:12 / 3:45</span>
              </div>
            </div>

            {/* AI Notes */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Insights</h3>
              <div className="space-y-3">
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase">Intent Detected</span>
                  </div>
                  <p className="text-sm text-foreground">Customer is inquiring about a refund for order #12345 due to delayed shipping.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-accent/50 rounded-2xl border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Confidence</p>
                    <p className="text-sm text-foreground">{selectedCall.aiConfidence}%</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-2xl border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Sentiment</p>
                    <p className="text-sm text-foreground">{selectedCall.sentiment}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcript */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transcript</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground">AI Assistant • 0:05</p>
                    <p className="text-xs text-foreground leading-relaxed">Hello! Thank you for calling Acme Inc support. How can I help you today?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground">John Doe • 0:12</p>
                    <p className="text-xs text-foreground leading-relaxed">Hi, I'm calling about my order #12345. It was supposed to arrive yesterday but I haven't received it yet.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground">AI Assistant • 0:20</p>
                    <p className="text-xs text-foreground leading-relaxed">I'm sorry to hear that. Let me check the status of that order for you. One moment please...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border grid grid-cols-2 gap-3 bg-accent/50">
            <button className="flex items-center justify-center gap-2 py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-accent transition-all btn-press">
              <UserPlus className="w-3 h-3" />
              Assign
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-accent transition-all btn-press">
              <TagIcon className="w-3 h-3" />
              Add Tag
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground hover:bg-accent transition-all btn-press">
              <Calendar className="w-3 h-3" />
              Follow-Up
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/20 transition-all btn-press">
              <AlertCircle className="w-3 h-3" />
              Escalate
            </button>
          </div>
        </div>
      )}

      {/* Test AI Call Modal */}
      <AnimatePresence>
        {isTestCallModalOpen && (
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
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Test AI Call Simulation</h2>
                    <p className="text-xs text-muted-foreground">Simulate a live call to test your AI agent's responses.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsTestCallModalOpen(false);
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
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Transcript</span>
                      {isSimulating && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-red-500 uppercase">Recording</span>
                        </div>
                      )}
                    </div>
                    <div className="h-64 bg-accent/30 border border-border rounded-2xl p-4 overflow-y-auto no-scrollbar space-y-4">
                      {!isSimulating ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                          <Bot className="w-8 h-8 text-muted-foreground opacity-20" />
                          <p className="text-xs text-muted-foreground">Click "Start Simulation" to begin the test call.</p>
                        </div>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {simulationStep >= 1 && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Bot className="w-3 h-3 text-primary" />
                              </div>
                              <p className="text-xs text-foreground bg-primary/5 p-2 rounded-lg rounded-tl-none border border-primary/10">
                                Hello! This is your AI assistant. How can I help you today?
                              </p>
                            </motion.div>
                          )}
                          {simulationStep >= 2 && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 flex-row-reverse">
                              <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-muted-foreground" />
                              </div>
                              <p className="text-xs text-foreground bg-accent/50 p-2 rounded-lg rounded-tr-none border border-border">
                                Hi, I want to check my order status for #9988.
                              </p>
                            </motion.div>
                          )}
                          {simulationStep >= 3 && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Bot className="w-3 h-3 text-primary" />
                              </div>
                              <p className="text-xs text-foreground bg-primary/5 p-2 rounded-lg rounded-tl-none border border-primary/10">
                                Searching... I see order #9988 is currently in transit and expected to arrive by tomorrow evening.
                              </p>
                            </motion.div>
                          )}
                          {simulationStep >= 4 && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 flex-row-reverse">
                              <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-muted-foreground" />
                              </div>
                              <p className="text-xs text-foreground bg-accent/50 p-2 rounded-lg rounded-tr-none border border-border">
                                Great, thank you!
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-48 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Agent</label>
                    <div className="p-3 bg-accent/50 border border-border rounded-xl text-xs text-foreground font-medium">
                      Refund Assistant
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Call Status</label>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isSimulating ? "bg-green-500" : "bg-gray-500"
                      )} />
                      <span className="text-xs text-foreground font-medium">
                        {isSimulating ? "Connected" : "Idle"}
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
                        className="w-full py-3 bg-destructive text-destructive-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all btn-press shadow-lg shadow-destructive/20 flex items-center justify-center gap-2"
                      >
                        <PhoneMissed className="w-4 h-4" />
                        End Call
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Start Outbound Call Modal */}
      <AnimatePresence>
        {isOutboundModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <PhoneCall className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Start Outbound Call</h2>
                    <p className="text-xs text-muted-foreground">Initiate an AI-powered call to a customer.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOutboundModalOpen(false)}
                  className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-all btn-press"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recipient Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe"
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Call Template</label>
                  <div className="relative">
                    <DropdownMenu
                      options={templates.map(t => ({ label: t.name, onClick: () => {} }))}
                    >
                      <span className="text-sm text-foreground">Select a template...</span>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Script / Instructions</label>
                  <textarea 
                    placeholder="Enter specific instructions for the AI agent during this call..."
                    className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 min-h-[100px] resize-none transition-all"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border flex items-center justify-end gap-3 bg-accent/50">
                <button 
                  onClick={() => setIsOutboundModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors btn-press"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleStartCall}
                  className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  Start Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
