import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  User, 
  Users, 
  Flag, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  Send,
  History,
  Lock,
  Sparkles,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { useToast } from '@/src/components/ui/Toast';

interface TicketUpdate {
  id: string;
  update_type: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  user_id: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  created_at: string;
}

interface TicketDetailData {
  id: string;
  conversation_id: string;
  title: string;
  status: string;
  priority: string;
  assigned_team_id: string | null;
  assigned_user_id: string | null;
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  assigned_team?: {
    id: string;
    name: string;
    members: {
      id: string;
      user: {
        id: string;
        full_name: string;
        avatar?: string;
      };
    }[];
  } | null;
  ai_metadata: {
    suggested_priority?: string;
    suggested_team_id?: string;
    suggested_title?: string;
    summary?: string;
    analyzed_at?: string;
  } | null;
  sla_tracking?: {
    id: string;
    first_response_due: string;
    resolution_due: string;
    first_response_at?: string;
    first_response_breached: boolean;
    resolution_breached: boolean;
  } | null;
  updates: TicketUpdate[];
  assignment_status: 'none' | 'pending' | 'accepted' | 'rejected';
}

interface Macro {
  id: string;
  name: string;
  shortcut: string;
  body: string;
  category?: string;
}

const SLATimer = ({ dueAt, label, breached }: { dueAt: string; label: string; breached: boolean }) => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const due = new Date(dueAt);
      const diff = due.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('BREACHED');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${mins}m`);
    };
    
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [dueAt]);

  const getUrgencyColor = () => {
    if (breached || timeLeft === 'BREACHED') return "text-red-500 animate-pulse font-black";
    
    const now = new Date();
    const due = new Date(dueAt);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 30 * 60 * 1000) return "text-red-500 animate-pulse font-black";
    if (diff < 60 * 60 * 1000) return "text-orange-500 font-black";
    
    return "text-foreground font-black";
  };

  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground uppercase font-bold">{label}</span>
      <span className={cn(
        "uppercase tracking-widest",
        getUrgencyColor()
      )}>
        {timeLeft}
      </span>
    </div>
  );
};

interface Message {
  id: string;
  sender_type: string;
  body: string;
  created_at: string;
}

export const TicketDetail = ({ 
  ticketId, 
  workspaceId, 
  onBack, 
  onViewChange 
}: { 
  ticketId: string; 
  workspaceId: string; 
  onBack: () => void;
  onViewChange: (view: string, id?: string) => void;
}) => {
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [showMacros, setShowMacros] = useState(false);
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTicketAndMessages();
    fetchMacros();
    fetchCurrentUser();
  }, [ticketId]);

  const fetchCurrentUser = async () => {
    try {
      const user = await api.auth.getMe();
      setCurrentUser(user);
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    }
  };

  const fetchMacros = async () => {
    try {
      const macroData = await api.tickets.getMacros(workspaceId);
      setMacros(macroData);
    } catch (err) {
      console.error("Failed to fetch macros:", err);
    }
  };

  const fetchTicketAndMessages = async () => {
    try {
      setIsLoading(true);
      const ticketData = await api.tickets.get(ticketId);
      setTicket(ticketData);
      
      const msgData = await api.conversations.getMessages(ticketData.conversation_id);
      setMessages(msgData);
    } catch (err) {
      console.error('Failed to fetch ticket details:', err);
      toast("Error", "Could not load ticket details", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || isSubmittingNote) return;

    try {
      setIsSubmittingNote(true);
      await api.tickets.addNote(ticketId, note);
      setNote('');
      fetchTicketAndMessages(); // Refresh timeline
      toast("Note Added", "Your internal comment has been saved", "success");
    } catch (err) {
      toast("Error", "Failed to add note", "error");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await api.tickets.update(ticketId, { status: newStatus });
      fetchTicketAndMessages();
      toast("Status Updated", `Ticket is now ${newStatus}`, "success");
    } catch (err) {
      toast("Error", "Failed to update status", "error");
    }
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      await api.tickets.analyze(ticketId);
      await fetchTicketAndMessages();
      toast("Analysis Complete", "AI has finished triaging the request", "success");
    } catch (err) {
      toast("Error", "AI analysis failed", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAISuggestions = async () => {
    if (!ticket?.ai_metadata) return;
    try {
      const { suggested_priority, suggested_team_id, suggested_title } = ticket.ai_metadata;
      await api.tickets.update(ticketId, {
        priority: suggested_priority,
        assigned_team_id: suggested_team_id,
        title: suggested_title
      });
      fetchTicketAndMessages();
      toast("Applied", "AI suggestions have been applied to this ticket", "success");
    } catch (err) {
      toast("Error", "Failed to apply suggestions", "error");
    }
  };

  const applyMacro = (macro: Macro) => {
    // Basic variable replacement
    let body = macro.body;
    const agentName = currentUser?.full_name || currentUser?.name || "Agent";
    
    body = body.replace(/\{\{customer\.name\}\}/gi, "Customer");
    body = body.replace(/\{\{agent\.name\}\}/gi, agentName);
    
    setNote(prev => prev + (prev ? "\n" : "") + body);
    setShowMacros(false);
    toast("Macro Applied", `Inserted ${macro.name}`, "success");
  };

  const handleClaim = async () => {
    try {
      await api.tickets.claim(ticketId);
      fetchTicketAndMessages();
      toast("Ticket Claimed", "You are now assigned to this ticket", "success");
    } catch (err) {
      toast("Error", "Failed to claim ticket", "error");
    }
  };

  const handleResumeChatting = () => {
    if (!ticket) return;
    // Use the smooth navigation if available
    onViewChange('all-conversations', ticket.conversation_id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="lg" />
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest animate-pulse">Loading Workspace...</p>
      </div>
    );
  }

  const handleAcceptAssignment = async () => {
    if (!ticket) return;
    try {
      const updated = await api.tickets.accept(ticket.id);
      setTicket(updated);
      toast("Success", "Assignment accepted. You now own this ticket.", "success");
    } catch (err: any) {
      toast("Error", err.message || "Failed to accept assignment", "error");
    }
  };

  const handleRejectAssignment = async () => {
    if (!ticket) return;
    try {
      const updated = await api.tickets.reject(ticket.id);
      setTicket(updated);
      toast("Assignment Rejected", "Ticket has been returned to the team pool.", "info");
    } catch (err: any) {
      toast("Error", err.message || "Failed to reject assignment", "error");
    }
  };

  if (!ticket) return null;

  const isAssignedToMe = ticket.assigned_user_id === currentUser?.id;
  const isPendingMyAcceptance = isAssignedToMe && ticket.assignment_status === 'pending';
  const isClaimedByOthers = ticket.assigned_user_id && 
                          ticket.assigned_user_id !== currentUser?.id &&
                          ticket.assignment_status !== 'rejected';
  
  return (
    <div className="h-full flex flex-col bg-background/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Ticket #{ticket.id.slice(0, 8)}</span>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                ticket.status === 'resolved' ? "border-green-500/20 bg-green-500/10 text-green-500" : "border-orange-500/20 bg-orange-500/10 text-orange-500"
              )}>
                {ticket.status}
              </div>
            </div>
            <h2 className="text-lg font-black text-foreground truncate max-w-md">{ticket.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!ticket.assigned_user_id || ticket.assignment_status === 'rejected' ? (
            <button 
              onClick={handleClaim}
              className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-lg"
            >
              <User className="w-3.5 h-3.5" />
              Claim Ticket
            </button>
          ) : isPendingMyAcceptance ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleAcceptAssignment}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
              >
                Accept Case
              </button>
              <button 
                onClick={handleRejectAssignment}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-red-500/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/5 transition-all"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              ticket.assigned_user_id === currentUser?.id 
                ? "bg-primary/5 border-primary/20 text-primary" 
                : "bg-orange-500/5 border-orange-500/20 text-orange-500"
            )}>
              {(ticket.assigned_user_id !== currentUser?.id || ticket.assignment_status === 'pending') && <Lock className="w-3 h-3 animate-pulse" />}
              {ticket.assigned_user_id === currentUser?.id 
                ? (ticket.assignment_status === 'pending' ? 'Handoff Pending' : 'Assigned to Me') 
                : `Claimed by ${ticket.assigned_user?.full_name || 'Agent'}`}
            </div>
          )}
          <button 
            onClick={() => handleUpdateStatus('resolved')}
            disabled={ticket.status === 'resolved'}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolve Ticket
          </button>
          <button className="p-2 bg-accent hover:bg-accent/80 border border-border rounded-xl text-muted-foreground transition-all">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Three-Pane Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left: Chat History (Context) */}
        <div className="w-[350px] flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border bg-accent/30 flex items-center gap-2 shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Conversation History</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-accent/10">
            {messages.map((m) => (
              <div key={m.id} className={cn(
                "flex flex-col max-w-[90%]",
                m.sender_type === 'customer' ? "items-start" : "items-end ml-auto"
              )}>
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm",
                  m.sender_type === 'customer' 
                    ? "bg-card border border-border text-foreground" 
                    : "bg-primary/10 border border-primary/20 text-foreground"
                )}>
                  {m.body}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 px-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border bg-accent/20">
             <button 
               onClick={handleResumeChatting}
               disabled={!isAssignedToMe || isPendingMyAcceptance || isClaimedByOthers}
               className={cn(
                 "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2",
                 (!isAssignedToMe || isPendingMyAcceptance || isClaimedByOthers) 
                   ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" 
                   : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20"
               )}
             >
               {(!isAssignedToMe || isPendingMyAcceptance || isClaimedByOthers) && <Lock className="w-3 h-3" />}
               {isClaimedByOthers 
                 ? 'Access Restricted' 
                 : !ticket.assigned_user_id 
                   ? 'Claim Case to Chat'
                   : isPendingMyAcceptance
                     ? 'Accept Case to Chat'
                     : 'Resume Chatting'}
             </button>
          </div>
        </div>

        {/* Center: Audit & Collaboration Timeline */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border bg-accent/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Activity & Internal Timeline</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-primary/5 rounded-lg border border-primary/10">
               <Lock className="w-3 h-3 text-primary" />
               <span className="text-[9px] font-black text-primary uppercase">Private Workspace</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {ticket.updates.map((update, i) => (
              <div key={update.id} className="relative pl-8">
                {/* Connector Line */}
                {i !== ticket.updates.length - 1 && (
                  <div className="absolute left-[3px] top-4 bottom-[-24px] w-[2px] bg-border/50" />
                )}
                
                {/* Timeline Node */}
                <div className={cn(
                  "absolute left-0 top-1 w-2 h-2 rounded-full",
                  update.update_type === 'comment' ? "bg-primary ring-4 ring-primary/10" : 
                  update.update_type === 'escalated' ? "bg-orange-500 ring-4 ring-orange-500/10" : 
                  "bg-muted-foreground/30"
                )} />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-foreground">
                      {update.user?.full_name || 'System'}
                    </span>
                    <span className={cn(
                      "text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md uppercase font-bold tracking-tighter",
                      update.update_type === 'escalated' ? "bg-orange-500/10 text-orange-600" : "bg-accent/50 text-muted-foreground"
                    )}>
                      {update.update_type === 'comment' ? 'Note' : 
                       update.update_type === 'escalated' ? 'Escalated' : 
                       update.update_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(update.created_at).toLocaleString()}</span>
                  </div>
                  
                  {update.note && (
                    <div className={cn(
                      "p-4 rounded-2xl text-xs",
                      update.update_type === 'comment' ? "bg-primary/5 border border-primary/10 text-foreground italic" : 
                      update.update_type === 'escalated' ? "bg-orange-500/5 border border-orange-500/10 text-foreground font-medium" : 
                      "text-muted-foreground"
                    )}>
                      {update.note}
                    </div>
                  )}
                  
                  {(update.update_type !== 'comment' && update.update_type !== 'escalated') && (
                    <p className="text-[10px] text-muted-foreground">
                      Changed <span className="font-bold text-foreground">{update.old_value || 'None'}</span> → <span className="font-bold text-primary">{update.new_value}</span>
                    </p>
                  )}

                  {update.update_type === 'escalated' && (
                    <p className="text-[10px] text-muted-foreground">
                      Handed off from <span className="font-bold text-foreground">{update.old_value || 'Direct'}</span> → <span className="font-bold text-orange-600 underline underline-offset-2 decoration-orange-500/30">{update.new_value}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={timelineEndRef} />
          </div>

          {/* Internal Comment Box */}
          <div className="p-4 border-t border-border bg-accent/10">
            <form onSubmit={handleAddNote} className="relative">
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === '/' && (note === '' || note.endsWith(' '))) {
                    e.preventDefault();
                    setShowMacros(true);
                  }
                }}
                placeholder="Type internal note (only visible to team)..."
                className="w-full h-24 p-4 pr-12 bg-card border border-border rounded-2xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={!note.trim() || isSubmittingNote}
                className="absolute bottom-4 right-4 p-2 bg-primary text-primary-foreground rounded-xl shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSubmittingNote ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
              </button>
              <button 
                type="button"
                onClick={() => setShowMacros(!showMacros)}
                className="absolute bottom-4 right-14 p-2 bg-accent text-muted-foreground rounded-xl hover:text-primary transition-all"
                title="Insert Macro"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showMacros && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-[calc(100%+8px)] right-0 w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 text-left"
                  >
                    <div className="p-3 border-b border-border bg-accent/30">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select Macro</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                      {macros.length > 0 ? macros.map(macro => (
                        <button 
                          key={macro.id}
                          type="button"
                          onClick={() => applyMacro(macro)}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-primary/10 transition-all group"
                        >
                          <p className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">{macro.name}</p>
                          <p className="text-[9px] text-muted-foreground/60 truncate">{macro.shortcut}</p>
                        </button>
                      )) : (
                        <div className="py-4 text-center text-[10px] text-muted-foreground">No macros found.</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>

        {/* Right: Metadata & Team Actions */}
        <div className="w-[300px] space-y-4 overflow-y-auto no-scrollbar">
          {/* AI Insight Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-primary/20 rounded-3xl p-5 space-y-4 shadow-sm relative overflow-hidden group"
          >
            {/* Animated Background Aura */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">AI Insight ✦</span>
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-all disabled:opacity-50"
                title="Re-run AI Analysis"
              >
                {isAnalyzing ? <Spinner size="sm" /> : <History className="w-3.5 h-3.5" />}
              </button>
            </div>

            {ticket.ai_metadata ? (
              <div className="space-y-4 relative z-10">
                <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10">
                   <p className="text-[11px] text-foreground leading-relaxed italic">
                     "{ticket.ai_metadata.summary}"
                   </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground uppercase font-bold">Suggested Priority</span>
                    <span className={cn(
                      "font-black uppercase tracking-widest",
                      ticket.ai_metadata.suggested_priority === 'critical' ? "text-red-500" : "text-primary"
                    )}>
                      {ticket.ai_metadata.suggested_priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground uppercase font-bold">Suggested Team</span>
                    <span className="text-foreground font-black uppercase tracking-widest">
                      {ticket.ai_metadata.suggested_team_id ? 'Support Match' : 'Unspecified'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleApplyAISuggestions}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Apply AI Suggestions
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
                 <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                    <Sparkles className="w-5 h-5 text-primary/30" />
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Unprocessed</p>
                    <p className="text-[9px] text-muted-foreground/60 max-w-[180px]">Run triage analysis to generate metadata suggestions.</p>
                 </div>
                 <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all border border-primary/30"
                 >
                    {isAnalyzing ? <Spinner size="sm" /> : 'Run Triage Analysis'}
                 </button>
              </div>
            )}
            
            {/* Analyzed Timestamp */}
            {ticket.ai_metadata?.analyzed_at && (
              <p className="text-[8px] text-muted-foreground/50 text-right uppercase font-bold tracking-tighter">
                Analyzed {new Date(ticket.ai_metadata.analyzed_at).toLocaleTimeString()}
              </p>
            )}
          </motion.div>

          {/* SLA Tracking Card */}
          <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm relative overflow-hidden group">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">SLA Targets</span>
                </div>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full bg-green-500",
                   ticket.sla_tracking?.first_response_breached ? "bg-red-500 animate-pulse" : ""
                )} />
             </div>

             <div className="space-y-3">
                {ticket.sla_tracking ? (
                  <>
                    <SLATimer 
                       dueAt={ticket.sla_tracking.first_response_due} 
                       label="Response Due" 
                       breached={ticket.sla_tracking.first_response_breached}
                    />
                    <SLATimer 
                       dueAt={ticket.sla_tracking.resolution_due} 
                       label="Resolution Due" 
                       breached={ticket.sla_tracking.resolution_breached}
                    />
                    {ticket.sla_tracking.first_response_at && (
                      <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                         <span className="text-[9px] text-muted-foreground uppercase font-bold">First Response</span>
                         <span className="text-[9px] font-black text-green-500 uppercase">SATISFIED</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[10px] text-muted-foreground italic text-center py-2">
                    Initializing SLA trackers...
                  </div>
                )}
             </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-card border border-border rounded-3xl p-5 space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Metadata</span>
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Priority
                  </div>
                  <select 
                    value={ticket.priority}
                    onChange={(e) => api.tickets.update(ticketId, { priority: e.target.value }).then(fetchTicketAndMessages)}
                    className="bg-accent border border-border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    Team
                  </div>
                  <button className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase group">
                    {ticket.assigned_team?.name || 'Unassigned'}
                    <Plus className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Team Members</span>
              </div>
              <div className="flex -space-x-2">
                {ticket.assigned_team?.members?.map(member => (
                  <div 
                    key={member.id} 
                    className="w-8 h-8 rounded-full bg-accent border-2 border-card flex items-center justify-center text-[10px] font-bold overflow-hidden"
                    title={member.user.full_name}
                  >
                    {member.user.avatar ? (
                      <img src={member.user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      member.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                    )}
                  </div>
                ))}
                {!ticket.assigned_team && (
                  <p className="text-[9px] text-muted-foreground italic">No team assigned</p>
                )}
                {ticket.assigned_team && ticket.assigned_team.members?.length === 0 && (
                  <p className="text-[9px] text-muted-foreground italic">No members in this team</p>
                )}
                <button className="w-8 h-8 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-primary ml-2">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Actions</span>
             <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-3 bg-accent/50 rounded-2xl hover:bg-accent transition-all group">
                   <div className="flex items-center gap-3">
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-foreground">View SLA Report</span>
                   </div>
                   <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:translate-x-1 transition-all" />
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
