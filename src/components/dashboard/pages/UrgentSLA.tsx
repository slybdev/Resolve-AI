import React from 'react';
import { Clock, AlertCircle, User, ArrowUpRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SLATicket {
  id: string;
  customer: string;
  summary: string;
  slaTimer: string;
  agent: string;
  priority: 'high' | 'critical';
}

const slaTickets: SLATicket[] = [
  {
    id: 'T-1001',
    customer: 'Wanda Maximoff',
    summary: 'Account access issue after reality shift.',
    slaTimer: '02:45',
    agent: 'Vision',
    priority: 'critical'
  },
  {
    id: 'T-1002',
    customer: 'Thor Odinson',
    summary: 'Hammer repair status inquiry.',
    slaTimer: '12:10',
    agent: 'Eitri',
    priority: 'high'
  }
];

export const UrgentSLA = ({ workspaceId }: { workspaceId: string }) => {
  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden gap-2 p-2">
      <div className="flex-1 overflow-y-auto no-scrollbar bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="max-w-6xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Urgent / SLA</h1>
          <p className="text-muted-foreground">High priority tickets requiring immediate action.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ticket ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Issue Summary</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SLA Timer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agent</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {slaTickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{ticket.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent" />
                      <span className="text-sm font-bold text-foreground">{ticket.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">{ticket.summary}</td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "flex items-center gap-1.5 font-mono text-sm font-bold",
                      ticket.priority === 'critical' ? "text-red-500" : "text-yellow-500"
                    )}>
                      <Clock className="w-3.5 h-3.5" />
                      {ticket.slaTimer}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{ticket.agent}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      ticket.priority === 'critical' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                    )}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};
