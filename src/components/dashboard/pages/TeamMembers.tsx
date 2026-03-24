import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, User, Mail, Shield, MoreVertical, CheckCircle2, XCircle, Loader2, Trash2, Ban, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { InviteModal } from './InviteModal';
import { motion, AnimatePresence } from 'framer-motion';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Agent' | 'Manager' | 'Support' | 'Owner';
  status: 'active' | 'invited' | 'inactive';
  isInvite?: boolean; // true if this is a pending invite row
}

export const TeamMembers = ({ workspaceId, currentUserRole }: { workspaceId: string, currentUserRole: string | null }) => {
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ 
    type: 'remove' | 'revoke', 
    id: string, 
    name: string 
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [workspaceId]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.team.members(workspaceId),
        api.team.invites(workspaceId).catch(() => [])
      ]);
      
      const mappedMembers: Member[] = membersRes.map((m: any) => ({
        id: m.user_id,
        name: m.user?.full_name || 'Unknown',
        email: m.user?.email || '',
        role: (m.role.charAt(0).toUpperCase() + m.role.slice(1)) as any,
        status: 'active',
        isInvite: false,
      }));

      const mappedInvites: Member[] = invitesRes.map((inv: any) => ({
        id: inv.id,
        name: 'Pending Invite',
        email: inv.email,
        role: (inv.role.charAt(0).toUpperCase() + inv.role.slice(1)) as any,
        status: 'invited',
        isInvite: true,
      }));

      setTeamMembers([...mappedMembers, ...mappedInvites]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.team.removeMember(workspaceId, memberId);
      fetchTeamMembers();
    } catch (err: any) {
      console.error('Failed to remove member:', err.message);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await api.team.revokeInvite(workspaceId, inviteId);
      fetchTeamMembers();
    } catch (err: any) {
      console.error('Failed to revoke invite:', err.message);
    } finally {
      setConfirmAction(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  return (
    <div className="flex flex-col h-full w-full bg-transparent p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Members</h1>
            <p className="text-muted-foreground">Manage your team and their access levels.</p>
          </div>
          <button 
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-colors"
          >
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
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                        <span className="text-xs font-bold text-primary">{getInitials(member.name)}</span>
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
                        member.role === 'Owner' || member.role === 'Admin' ? "text-red-500" : member.role === 'Manager' ? "text-blue-500" : "text-muted-foreground"
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
                    {isAdminOrOwner && (
                      <div className="relative inline-block" ref={member.id === openMenuId ? menuRef : null}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === member.id && (
                          <div className={cn(
                            "absolute right-0 z-50 w-44 bg-popover border border-border rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2",
                            // If it's the last row or one above, open upwards to avoid being cut off
                            teamMembers.indexOf(member) >= teamMembers.length - 2 ? "bottom-full mb-1" : "top-full mt-1"
                          )}>
                            {member.isInvite ? (
                              <button
                                onClick={() => {
                                  setConfirmAction({ type: 'revoke', id: member.id, name: member.email });
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <Ban className="w-4 h-4" />
                                Revoke Invite
                              </button>
                            ) : (
                              <button
                                disabled={member.role === 'Owner'}
                                onClick={() => {
                                  if (member.role === 'Owner') return;
                                  setConfirmAction({ type: 'remove', id: member.id, name: member.name });
                                  setOpenMenuId(null);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                  member.role === 'Owner' 
                                    ? "text-muted-foreground/50 cursor-not-allowed" 
                                    : "text-red-500 hover:bg-red-500/10"
                                )}
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove Member
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        workspaceId={workspaceId}
        onInviteSuccess={fetchTeamMembers}
      />

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {confirmAction.type === 'remove' ? 'Remove Member?' : 'Revoke Invite?'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Are you sure you want to {confirmAction.type === 'remove' ? 'remove' : 'revoke the invite for'} <span className="font-bold text-foreground">{confirmAction.name}</span>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => confirmAction.type === 'remove' ? handleRemoveMember(confirmAction.id) : handleRevokeInvite(confirmAction.id)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Yes, {confirmAction.type === 'remove' ? 'Remove' : 'Revoke'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
