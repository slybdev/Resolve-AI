import React, { useState, useEffect } from 'react';
import { 
  X, 
  Ticket, 
  AlertCircle, 
  Users, 
  Flag, 
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';
import { Spinner } from '@/src/components/ui/ios-spinner';

interface Team {
  id: string;
  name: string;
}

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  conversationId: string;
  customerName: string;
}

export const CreateTicketModal = ({ isOpen, onClose, workspaceId, conversationId, customerName }: CreateTicketModalProps) => {
  const [existingTicket, setExistingTicket] = useState<any>(null);
  const [escalationNote, setEscalationNote] = useState('');
  const [title, setTitle] = useState(`Support for ${customerName}`);
  const [priority, setPriority] = useState('medium');
  const [teamId, setTeamId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingTicket, setIsCheckingTicket] = useState(true);
  const [isFetchingTeams, setIsFetchingTeams] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && conversationId) {
      checkExistingTicket();
      fetchTeams();
    }
  }, [isOpen, conversationId]);

  const checkExistingTicket = async () => {
    try {
      setIsCheckingTicket(true);
      const ticket = await api.tickets.getByConversation(conversationId);
      setExistingTicket(ticket);
      if (ticket) {
        setTitle(ticket.title);
        setPriority(ticket.priority);
        setTeamId(ticket.assigned_team_id || '');
      }
    } catch (err) {
      console.error('Failed to check existing ticket:', err);
    } finally {
      setIsCheckingTicket(false);
    }
  };

  const fetchTeams = async () => {
    try {
      setIsFetchingTeams(true);
      const data = await api.team.getFunctionalTeams(workspaceId);
      setTeams(data);
      if (data.length > 0) setTeamId(data[0].id);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      toast("Error", "Failed to load teams", "error");
    } finally {
      setIsFetchingTeams(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (existingTicket) {
        // Handle Escalation
        await api.tickets.escalate(existingTicket.id, {
          assigned_team_id: teamId,
          note: escalationNote
        });
        toast(
          "Ticket Escalated 🚀",
          `Successfully escalated to ${teams.find(t => t.id === teamId)?.name}`,
          "success"
        );
      } else {
        // Handle New Ticket
        await api.tickets.create({
          workspace_id: workspaceId,
          conversation_id: conversationId,
          title,
          priority,
          assigned_team_id: teamId || null,
          created_by_ai: false
        });
        toast(
          "Ticket Created 🎫",
          `Successfully created ticket for ${customerName}`,
          "success"
        );
      }
      onClose();
    } catch (err: any) {
      toast(
        existingTicket ? "Escalation Failed" : "Creation Failed",
        err.message || "Something went wrong",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden shadow-primary/10"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
                    {isCheckingTicket ? 'Verifying Case...' : existingTicket ? 'Escalate Ticket' : 'Create Ticket'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase opacity-70">
                    {existingTicket ? `Existing Case: #${existingTicket.id.substring(0, 8)}` : `New Case for ${customerName}`}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  {existingTicket ? 'Case Subject (Read-Only)' : 'Ticket Title'}
                </label>
                <input 
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => !existingTicket && setTitle(e.target.value)}
                  readOnly={!!existingTicket}
                  className={cn(
                    "w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium",
                    existingTicket && "opacity-60 cursor-not-allowed bg-accent/30"
                  )}
                  placeholder="e.g. Refund request for order #123"
                  required
                />
              </div>

              {existingTicket && (
                 <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                    Escalation Notes / Reason
                  </label>
                  <textarea 
                    value={escalationNote}
                    onChange={(e) => setEscalationNote(e.target.value)}
                    className="w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium min-h-[100px] resize-none"
                    placeholder="Provide context for the next team (internal only)..."
                    required={!!existingTicket}
                  />
                </div>
              )}

              {/* Team & Priority Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Assign Team
                  </label>
                  <select 
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none cursor-pointer"
                    required
                    disabled={isFetchingTeams}
                  >
                    {isFetchingTeams ? (
                      <option>Loading...</option>
                    ) : teams.length === 0 ? (
                      <option value="">No teams found</option>
                    ) : (
                      teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Flag className="w-3 h-3" /> Priority
                  </label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* AI Insight Placeholder */}
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase">Support AI Logic</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    AI logic is currently paused. Once enabled, this ticket would be auto-summarized and routed based on severity.
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                <button 
                  disabled={isLoading || isFetchingTeams}
                  type="submit"
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  {isLoading ? <Spinner size="sm" /> : (
                    <>
                      {existingTicket ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {existingTicket ? 'Escalate & Notify Team' : 'Create Ticket'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
