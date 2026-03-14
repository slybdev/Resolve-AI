import React from 'react';
import { Plus, Search, User, Mail, Shield, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Agent' | 'Manager';
  status: 'active' | 'invited' | 'inactive';
}

const members: Member[] = [
  { id: '1', name: 'Tony Stark', email: 'tony@stark.com', role: 'Admin', status: 'active' },
  { id: '2', name: 'Steve Rogers', email: 'steve@avengers.com', role: 'Manager', status: 'active' },
  { id: '3', name: 'Natasha Romanoff', email: 'natasha@shield.gov', role: 'Agent', status: 'active' },
  { id: '4', name: 'Peter Parker', email: 'peter@dailybugle.com', role: 'Agent', status: 'invited' }
];

export const TeamMembers = () => {
  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Members</h1>
            <p className="text-muted-foreground">Manage your team and their access levels.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-colors">
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search members by name or email..." 
            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Member</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Active</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{member.name}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Shield className={cn(
                        "w-3.5 h-3.5",
                        member.role === 'Admin' ? "text-red-500" : member.role === 'Manager' ? "text-blue-500" : "text-muted-foreground"
                      )} />
                      <span className="text-sm text-muted-foreground">{member.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      member.status === 'active' ? "bg-green-500/10 text-green-600 border border-green-500/20" : 
                      member.status === 'invited' ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : 
                      "bg-muted text-muted-foreground border border-border"
                    )}>
                      {member.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {member.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">2h ago</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
