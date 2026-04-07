import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Flag,
  ArrowUpRight,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { useToast } from '@/src/components/ui/Toast';

interface TicketData {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_team_id: string | null;
  created_at: string;
  customer_name?: string;
  sla_tracking?: {
    id: string;
    first_response_due: string;
    first_response_at?: string;
    first_response_breached: boolean;
  } | null;
}

export const TicketsDashboard = ({ 
  workspaceId, 
  onSelectTicket 
}: { 
  workspaceId: string; 
  onSelectTicket?: (id: string) => void;
}) => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, [workspaceId, filterStatus]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const data = await api.tickets.list(workspaceId, { 
        status: filterStatus === 'all' ? undefined : filterStatus 
      });
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      toast("Error", "Failed to load tickets", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdate = async (status?: string) => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkUpdating(true);
      await api.tickets.bulkUpdate(workspaceId, {
        ticket_ids: selectedIds,
        status
      });
      toast("Bulk Update Successful", `Updated ${selectedIds.length} tickets`, "success");
      setSelectedIds([]);
      fetchTickets();
    } catch (err) {
      toast("Bulk Update Failed", "Could not update some tickets", "error");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

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
      case 'resolved': return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case 'in_progress': return <Clock className="w-3.5 h-3.5 text-blue-500" />;
      case 'open': return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />;
      default: return <Ticket className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getSLABadge = (ticket: TicketData) => {
    if (!ticket.sla_tracking || ticket.sla_tracking.first_response_at) return null;
    
    const now = new Date();
    const due = new Date(ticket.sla_tracking.first_response_due);
    const isBreached = ticket.sla_tracking.first_response_breached || due < now;
    
    if (isBreached) {
      return (
        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-sm">
          <Clock className="w-2.5 h-2.5" />
          Breached
        </div>
      );
    }
    
    const diff = due.getTime() - now.getTime();
    if (diff < 120 * 60 * 1000) {
      return (
        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter text-orange-500 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-sm animate-pulse">
          <Clock className="w-2.5 h-2.5" />
          Due Soon
        </div>
      );
    }

    return null;
  };

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-transparent p-6 space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            Support <span className="text-primary">Tickets</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Enterprise-grade triage and team-based resolution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
          <button className="p-2 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Unassigned', 
            value: tickets.filter(t => !t.assigned_team_id && t.status !== 'resolved').length.toString().padStart(2, '0'), 
            icon: Users, 
            color: 'text-orange-500' 
          },
          { 
            label: 'Urgent', 
            value: tickets.filter(t => ['critical', 'high'].includes(t.priority) && t.status !== 'resolved').length.toString().padStart(2, '0'), 
            icon: AlertCircle, 
            color: 'text-red-500' 
          },
          { 
            label: 'SLA Overdue', 
            value: tickets.filter(t => t.sla_tracking?.first_response_breached).length.toString().padStart(2, '0'), 
            icon: Clock, 
            color: 'text-zinc-500' 
          },
          { 
            label: 'Resolved Today', 
            value: tickets.filter(t => t.status === 'resolved').length.toString().padStart(2, '0'), 
            icon: CheckCircle2, 
            color: 'text-green-500' 
          },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="p-5 bg-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={cn("p-2 rounded-xl bg-accent/50", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-2xl font-black">{stat.value}</span>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main List */}
      <div className="flex-1 bg-card border border-border rounded-3xl overflow-hidden flex flex-col shadow-xl shadow-primary/5">
        <div className="px-6 py-4 border-b border-border bg-accent/30 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {['all', 'open', 'in_progress', 'resolved'].map((s) => (
              <button 
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest transition-all relative pb-1",
                  filterStatus === s ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.replace('_', ' ')}
                {filterStatus === s && <motion.div layoutId="statusTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {filteredTickets.length} Tickets Found
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <Spinner size="lg" />
              <p className="text-xs font-bold text-muted-foreground uppercase animate-pulse">Scanning Vault...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-40">
              <Ticket className="w-12 h-12 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No tickets in this vault branch</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTickets.map((ticket, i) => (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  key={ticket.id}
                  onClick={() => onSelectTicket?.(ticket.id)}
                  className={cn(
                    "px-6 py-5 hover:bg-accent/50 cursor-pointer transition-all flex items-center group relative",
                    selectedIds.includes(ticket.id) ? "bg-primary/5" : ""
                  )}
                >
                  <div className="flex items-center pr-4">
                     <button
                        onClick={(e) => toggleSelect(ticket.id, e)}
                        className={cn(
                          "w-4 h-4 rounded border transition-all flex items-center justify-center",
                          selectedIds.includes(ticket.id) ? "bg-primary border-primary text-white" : "border-border hover:border-primary/50"
                        )}
                     >
                        {selectedIds.includes(ticket.id) && <CheckCircle2 className="w-3 h-3" />}
                     </button>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 border border-border group-hover:border-primary/30 transition-all">
                    {getStatusIcon(ticket.status)}
                  </div>
                  
                  <div className="ml-5 flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{ticket.title}</h4>
                      <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0", getPriorityColor(ticket.priority))}>
                        {ticket.priority}
                      </div>
                      {getSLABadge(ticket)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Users className="w-3 h-3" />
                        <span>Security Team</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <div className="hidden group-hover:flex items-center gap-2 pr-4 animate-in fade-in slide-in-from-right-2">
                       <button className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                         Assign
                       </button>
                    </div>
                    <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-card border border-primary/20 rounded-2xl shadow-2xl shadow-primary/10"
            >
              <div className="flex items-center gap-2 pr-4 border-r border-border">
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedIds.length} Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleBulkUpdate('resolved')}
                  disabled={isBulkUpdating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  {isBulkUpdating ? <Spinner size="sm" /> : <CheckCircle2 className="w-3 h-3" />}
                  Bulk Resolve
                </button>
                <button 
                   onClick={() => setSelectedIds([])}
                   className="px-3 py-1.5 bg-accent text-muted-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Pulse */}
      <div className="p-4 bg-primary/5 border border-primary/10 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <Sparkles className="relative w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Advanced AI Intelligence ACTIVE</p>
            <p className="text-[11px] text-muted-foreground font-medium">AI Triage, Automated SLAs, and searchable Macros are currently processing support tickets.</p>
          </div>
        </div>
        <button className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
          Enable Auto-Pilot
        </button>
      </div>
    </div>
  );
};
