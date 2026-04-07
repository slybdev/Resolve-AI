import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { InviteModal } from './InviteModal';
import { FunctionalTeamModal } from './FunctionalTeamModal';
import { Users as UsersIcon, Shield as ShieldIcon, MoreVertical, CheckCircle2, XCircle, Loader2, Trash2, Ban, AlertCircle, Layout, PlusCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Agent' | 'Manager' | 'Support' | 'Owner';
  status: 'active' | 'invited' | 'inactive';
  isInvite?: boolean;
}

interface FunctionalTeam {
  id: string;
  name: string;
  description: string;
  allowed_pages: string[];
  members: any[];
}

export const TeamMembers = ({ workspaceId, currentUserRole }: { workspaceId: string, currentUserRole: string | null }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'teams'>('members');
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [functionalTeams, setFunctionalTeams] = useState<FunctionalTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ 
    type: 'remove' | 'revoke' | 'delete_team', 
    id: string, 
    name: string 
  } | null>(null);
  const [editingTeam, setEditingTeam] = useState<FunctionalTeam | null>(null);
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
    if (activeTab === 'members') fetchTeamMembers();
    else fetchFunctionalTeams();
  }, [workspaceId, activeTab]);

  const fetchFunctionalTeams = async () => {
    setIsLoading(true);
    try {
      const res = await api.team.getFunctionalTeams(workspaceId);
      setFunctionalTeams(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const getInitials = (name?: string) => {
    if (!name || name === 'Unknown') return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEditTeam = (team: FunctionalTeam) => {
    setEditingTeam(team);
    setIsTeamModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await api.team.deleteFunctionalTeam(workspaceId, teamId);
      fetchFunctionalTeams();
      setConfirmAction(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workspace Admin</h1>
            <p className="text-muted-foreground">Manage your people and specialized functional teams.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsTeamModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground rounded-xl text-sm font-bold border border-border hover:bg-border transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              New Team
            </button>
            <button 
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
            >
              <UsersIcon className="w-4 h-4" />
              Invite Member
            </button>
          </div>
        </div>

        <div className="flex border-b border-border">
          <button 
            onClick={() => setActiveTab('members')}
            className={cn(
              "px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative",
              activeTab === 'members' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Members
            {activeTab === 'members' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={cn(
              "px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative",
              activeTab === 'teams' ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Functional Teams
            {activeTab === 'teams' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>

        <div className="relative">
          <UsersIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder={activeTab === 'members' ? "Search members by name or email..." : "Search teams by name..."}
            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          {activeTab === 'members' ? (
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
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading...</div>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-red-500 font-bold">{error}</td>
                  </tr>
                ) : teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground font-bold">No members found.</td>
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
                        <ShieldIcon className={cn(
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
          ) : (
            <div className="divide-y divide-border/50">
              {isLoading ? (
                <div className="px-6 py-20 text-center flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Teams...</div>
                </div>
              ) : functionalTeams.length === 0 ? (
                <div className="px-6 py-20 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-muted-foreground">
                    <ShieldIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-foreground">No Teams Created</h3>
                    <p className="text-xs text-muted-foreground mt-1">Functional teams allow specialized triage and access control.</p>
                  </div>
                  <button 
                    onClick={() => setIsTeamModalOpen(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-lg shadow-primary/20"
                  >
                    Create First Team
                  </button>
                </div>
              ) : functionalTeams.map((team) => (
                <div key={team.id} className="p-8 hover:bg-muted/10 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                          <ShieldIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{team.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{team.description || 'No description provided.'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Layout className="w-3 h-3" />
                          Authorized Pages
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {team.allowed_pages.length > 0 ? team.allowed_pages.map(page => (
                            <span key={page} className="px-2 py-0.5 rounded bg-accent border border-border text-[9px] font-black uppercase tracking-tight text-foreground">
                              {page.replace(/_/g, ' ')}
                            </span>
                          )) : (
                            <span className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[9px] font-black uppercase tracking-tight text-green-600">
                              Full Dashboard Access
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                      <div className="flex -space-x-2">
                        {(team.members || []).length > 0 ? (team.members || []).map((m, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-accent border-2 border-card flex items-center justify-center text-[10px] font-bold shadow-sm" title={m.user?.full_name}>
                            {getInitials(m.user?.full_name)}
                          </div>
                        )) : (
                          <div className="text-[10px] font-bold text-muted-foreground uppercase border border-border border-dashed py-1.5 px-3 rounded-full">
                            0 Members
                          </div>
                        )}
                        <button className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity">
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditTeam(team)}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Edit Team
                        </button>
                        <button 
                          onClick={() => setConfirmAction({ id: team.id, name: team.name, type: 'delete_team' as any })}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FunctionalTeamModal 
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setEditingTeam(null);
        }}
        workspaceId={workspaceId}
        initialTeam={editingTeam}
        onSuccess={() => {
          fetchFunctionalTeams();
          fetchTeamMembers();
        }}
      />

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
                    {confirmAction.type === 'remove' ? 'Remove Member?' : 
                     confirmAction.type === 'revoke' ? 'Revoke Invite?' : 
                     'Delete Functional Team?'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Are you sure you want to {
                      confirmAction.type === 'remove' ? 'remove' : 
                      confirmAction.type === 'revoke' ? 'revoke the invite for' : 
                      'permanently delete the team'
                    } <span className="font-bold text-foreground">{confirmAction.name}</span>? This action cannot be undone.
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
                  onClick={() => {
                    if (confirmAction.type === 'remove') handleRemoveMember(confirmAction.id);
                    else if (confirmAction.type === 'revoke') handleRevokeInvite(confirmAction.id);
                    else if (confirmAction.type === 'delete_team' as any) handleDeleteTeam(confirmAction.id);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Yes, {confirmAction.type === 'remove' ? 'Remove' : confirmAction.type === 'revoke' ? 'Revoke' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
