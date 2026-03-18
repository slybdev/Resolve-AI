import React, { useState, useEffect } from 'react';
import { Plus, Search, User, Mail, Shield, MoreVertical, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Agent' | 'Manager';
  status: 'active' | 'invited' | 'inactive';
}

export const TeamMembers = ({ workspaceId }: { workspaceId: string }) => {
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, [workspaceId]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const response = await api.team.members(workspaceId);
      // Map WorkspaceMember to the frontend Member interface
      const mappedMembers: Member[] = response.map((m: any) => ({
        id: m.user_id,
        name: m.user?.full_name || 'Unknown',
        email: m.user?.email || '',
        role: (m.role.charAt(0).toUpperCase() + m.role.slice(1)) as any,
        status: m.user ? 'active' : 'inactive'
      }));
      setTeamMembers(mappedMembers);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col h-full w-full bg-transparent p-8 overflow-y-auto no-scrollbar">
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Team...</div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-red-500 font-bold">{error}</td>
                </tr>
              ) : teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground font-bold">No team members found.</td>
                </tr>
              ) : teamMembers.map((member) => (
                <tr key={member.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden">
                        <img 
                          src={`https://picsum.photos/seed/${member.id}/100/100`} 
                          alt={member.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
                          }}
                        />
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
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">Just now</td>
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
