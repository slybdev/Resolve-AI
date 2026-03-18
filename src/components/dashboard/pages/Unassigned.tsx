import React from 'react';
import { Bot, Clock, ShieldCheck, UserPlus, FileText } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface UnassignedTicket {
  id: string;
  customerName: string;
  issue: string;
  time: string;
  aiSummary: string;
  avatar: string;
}

const unassignedTickets: UnassignedTicket[] = [
  {
    id: '1',
    customerName: 'Bruce Wayne',
    issue: 'I need a new batmobile part.',
    time: '2m ago',
    aiSummary: 'Customer is requesting a replacement part for a high-value vehicle. The request is urgent and requires immediate attention.',
    avatar: 'https://i.pravatar.cc/150?u=bruce'
  },
  {
    id: '2',
    customerName: 'Peter Parker',
    issue: 'My web-shooter is jammed.',
    time: '15m ago',
    aiSummary: 'Customer is reporting a technical issue with a personal device. The issue is recurring and requires a technical support agent.',
    avatar: 'https://i.pravatar.cc/150?u=peter'
  }
];

export const Unassigned = ({ workspaceId }: { workspaceId: string }) => {
  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden gap-2 p-2">
      <div className="flex-1 overflow-y-auto no-scrollbar bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Unassigned Conversations</h1>
            <p className="text-muted-foreground">New conversations waiting for an agent.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-accent/50 border border-border rounded-xl text-xs font-bold text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {unassignedTickets.length} Pending
          </div>
        </div>

        <div className="grid gap-6">
          {unassignedTickets.map((ticket) => (
            <div key={ticket.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row gap-6 transition-all hover:border-primary/20">
              <div className="flex items-center gap-4 shrink-0">
                <img src={ticket.avatar} className="w-16 h-16 rounded-full border border-border" alt="" referrerPolicy="no-referrer" />
                <div>
                  <h3 className="text-lg font-bold text-foreground">{ticket.customerName}</h3>
                  <p className="text-xs text-muted-foreground">Received {ticket.time}</p>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="bg-accent/30 border border-border/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">AI Summary</span>
                  </div>
                  <p className="text-sm text-foreground/80 italic leading-relaxed">
                    "{ticket.aiSummary}"
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-accent text-muted-foreground border border-border rounded-lg text-[10px] font-bold">Technical</span>
                  <span className="px-2 py-1 bg-accent text-muted-foreground border border-border rounded-lg text-[10px] font-bold">Urgent</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0 md:w-48">
                <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/10">
                  <UserPlus className="w-4 h-4" />
                  Claim Ticket
                </button>
                <button className="w-full py-3 bg-accent text-foreground border border-border rounded-xl font-bold text-sm hover:bg-accent/80 transition-colors flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  View AI Summary
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};
