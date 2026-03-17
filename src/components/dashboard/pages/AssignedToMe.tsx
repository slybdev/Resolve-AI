import React from 'react';
import { AllConversations } from './AllConversations';
import { Clock, AlertCircle, ShieldCheck } from 'lucide-react';

export const AssignedToMe = ({ workspaceId }: { workspaceId: string }) => {
  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header for Assigned to Me */}
      <div className="h-20 border-b border-border flex items-center justify-between px-8 shrink-0 bg-card/50">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Assigned</p>
            <h2 className="text-2xl font-bold text-foreground">12 Tickets</h2>
          </div>
          <div className="h-10 w-[1px] bg-border" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">SLA Countdown</p>
            <div className="flex items-center gap-2 text-red-500">
              <Clock className="w-4 h-4" />
              <span className="text-xl font-bold">14:22</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold">
            <AlertCircle className="w-3 h-3" />
            3 High Priority
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-xs font-bold">
            <ShieldCheck className="w-3 h-3" />
            SLA Compliant
          </div>
        </div>
      </div>

      {/* Reusing the AllConversations layout but filtered (mocked here) */}
      <div className="flex-1 overflow-hidden">
        <AllConversations workspaceId={workspaceId} />
      </div>
    </div>
  );
};
