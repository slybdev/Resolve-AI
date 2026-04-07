import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ChevronRight,
  MessageSquare,
  Filter,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { useToast } from '@/src/components/ui/Toast';

interface TicketData {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_user_id: string | null;
  created_at: string;
  sla_tracking?: {
    id: string;
    first_response_due: string;
    first_response_at?: string;
    first_response_breached: boolean;
    resolution_due: string;
    resolution_breached: boolean;
  } | null;
}

export const AssignedToMe = ({ 
  workspaceId, 
  onSelectTicket 
}: { 
  workspaceId: string; 
  onSelectTicket?: (id: string) => void;
}) => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const user = await api.auth.getMe();
        setCurrentUser(user);
        
        const data = await api.tickets.list(workspaceId, { 
          assigned_user_id: user.id 
        });
        setTickets(data);
      } catch (err) {
        console.error('Failed to load assigned tickets:', err);
        toast("Error", "Could not load your tickets", "error");
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, [workspaceId]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
  };

  // Calculate stats
  const activeTickets = tickets.filter(t => t.status !== 'resolved');
  const criticalTickets = activeTickets.filter(t => ['high', 'critical'].includes(t.priority));
  const slaBreached = activeTickets.filter(t => t.sla_tracking?.first_response_breached || t.sla_tracking?.resolution_breached);

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden gap-4 p-4">
      {/* Header for Assigned to Me */}
      <div className="h-20 border border-border flex items-center justify-between px-8 shrink-0 bg-card rounded-3xl shadow-sm">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">My Active Tickets</p>
            <h2 className="text-2xl font-black text-foreground">{activeTickets.length.toString().padStart(2, '0')}</h2>
          </div>
          <div className="h-10 w-[1px] bg-border" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Urgent Attention</p>
            <div className={cn(
              "flex items-center gap-2",
              criticalTickets.length > 0 ? "text-red-500" : "text-muted-foreground"
            )}>
              <AlertCircle className="w-4 h-4" />
              <span className="text-xl font-bold">{criticalTickets.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-widest",
            slaBreached.length > 0 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
          )}>
            {slaBreached.length > 0 ? <Clock className="w-3.5 h-3.5 animate-pulse" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {slaBreached.length > 0 ? `${slaBreached.length} SLA Risk` : 'SLA Compliant'}
          </div>
        </div>
      </div>

      {/* Ticket List */}
      <div className="flex-1 bg-card border border-border rounded-3xl overflow-hidden flex flex-col shadow-sm transition-all duration-500">
        <div className="px-6 py-4 border-b border-border bg-accent/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Personal Queue</span>
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {tickets.length} Tickets Found
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <Spinner size="lg" />
              <p className="text-xs font-bold text-muted-foreground uppercase animate-pulse">Synchronizing Queue...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-40">
              <ShieldCheck className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Inbox Zero — Nothing assigned to you</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tickets.map((ticket, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={ticket.id}
                  onClick={() => onSelectTicket?.(ticket.id)}
                  className="px-6 py-5 hover:bg-accent/50 cursor-pointer transition-all flex items-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 border border-border group-hover:border-primary/30 transition-all">
                    {getStatusIcon(ticket.status)}
                  </div>
                  
                  <div className="ml-5 flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{ticket.title}</h4>
                      <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0", getPriorityColor(ticket.priority))}>
                        {ticket.priority}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Clock className="w-3 h-3" />
                        <span>Last updated {new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                      {ticket.sla_tracking && !ticket.sla_tracking.first_response_at && (
                         <div className={cn(
                           "flex items-center gap-1 text-[9px] font-black uppercase",
                           ticket.sla_tracking.first_response_breached ? "text-red-500" : "text-orange-500"
                         )}>
                            • {ticket.sla_tracking.first_response_breached ? 'Breached' : 'SLA Active'}
                         </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                      Open Detail
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
