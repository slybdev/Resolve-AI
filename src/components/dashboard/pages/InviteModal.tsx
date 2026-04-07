import React, { useState } from 'react';
import { X, Mail, Shield, Check, Copy, CheckCircle2, Loader2, Users, Info, Send as SendIcon, Lock as LockIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { api } from '../../../lib/api';

// These match the sidebar view keys — top-level sections only
// These match the sidebar sections and view keys
const DASHBOARD_SECTIONS = [
  {
    id: 'inbox',
    label: 'Inbox',
    pages: [
      { id: 'all-conversations', label: 'All Conversations' },
      { id: 'assigned-to-me', label: 'Assigned to Me' },
      { id: 'unassigned', label: 'Unassigned' },
      { id: 'urgent-sla', label: 'Urgent / SLA' },
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    pages: [
      { id: 'people', label: 'People & CRM' },
      { id: 'csat', label: 'CSAT & Sentiment' },
    ]
  },
  {
    id: 'support',
    label: 'Support',
    pages: [
      { id: 'tickets', label: 'All Tickets' },
      { id: 'functional-teams', label: 'Functional Teams' },
      { id: 'sla-breaches', label: 'SLA Breaches' },
    ]
  },
  {
    id: 'outbound',
    label: 'Outbound',
    pages: [
      { id: 'outbound', label: 'Campaigns' },
      { id: 'product-tours', label: 'Product Tours' },
      { id: 'news', label: 'News & Updates' },
    ]
  },
  {
    id: 'ai-agent',
    label: 'AI Agent',
    pages: [
      { id: 'analyze', label: 'Analyze' },
      { id: 'ai-settings', label: 'Persona & Rules' },
      { id: 'train', label: 'Train Agent' },
      { id: 'help-center', label: 'Public Help Center' },
      { id: 'test', label: 'Test' },
      { id: 'deploy', label: 'Deploy' },
    ]
  },
  {
    id: 'channels',
    label: 'Channels',
    pages: [
      { id: 'website-chat', label: 'Website Chat' },
      { id: 'email', label: 'Email' },
      { id: 'whatsapp', label: 'WhatsApp' },
      { id: 'instagram', label: 'Instagram' },
      { id: 'facebook', label: 'Facebook Messenger' },
      { id: 'telegram', label: 'Telegram' },
      { id: 'slack', label: 'Slack' },
      { id: 'voice-ai', label: 'Voice AI' },
    ]
  },
  {
    id: 'automation',
    label: 'Automation',
    pages: [
      { id: 'ai-automations', label: 'AI Automations' },
      { id: 'macros', label: 'Macros & Snippets' },
      { id: 'escalations', label: 'Escalations' },
      { id: 'workflows', label: 'Workflows' },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    pages: [
      { id: 'team-members', label: 'Team Members' },
      { id: 'business-hours', label: 'Business Hours & SLA' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'chat-widget', label: 'Chat Widget' },
      { id: 'billing', label: 'Billing' },
      { id: 'api-keys', label: 'API Keys' },
    ]
  }
];

const ALL_PAGES = DASHBOARD_SECTIONS.flatMap(s => s.pages);

const ROLES = ['admin', 'manager', 'support'];

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName?: string;
  inviterName?: string;
  onInviteSuccess: () => void;
}

export const InviteModal = ({ isOpen, onClose, workspaceId, workspaceName = 'Workspace', inviterName = 'Team Admin', onInviteSuccess }: InviteModalProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('support');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [functionalTeams, setFunctionalTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen, workspaceId]);

  const fetchTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const teams = await api.team.getFunctionalTeams(workspaceId);
      setFunctionalTeams(teams);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  if (!isOpen) return null;

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    if (teamId) {
      const team = functionalTeams.find(t => t.id === teamId);
      if (team && team.allowed_pages?.length > 0) {
        setSelectedPages(team.allowed_pages);
      }
    }
  };

  const togglePage = (key: string) => {
    setSelectedPages(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSection = (sectionId: string) => {
    const section = DASHBOARD_SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    
    const sectionPageIds = section.pages.map(p => p.id);
    const allSelected = sectionPageIds.every(id => selectedPages.includes(id));
    
    if (allSelected) {
      setSelectedPages(prev => prev.filter(id => !sectionPageIds.includes(id)));
    } else {
      setSelectedPages(prev => [...new Set([...prev, ...sectionPageIds])]);
    }
  };

  const selectAll = () => {
    if (selectedPages.length === ALL_PAGES.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(ALL_PAGES.map(p => p.id));
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api.team.invite(workspaceId, {
        email: email.trim(),
        role,
        allowed_pages: selectedPages,
        team_id: selectedTeamId || undefined,
      });
      setInviteResult(result);
      onInviteSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteLink = inviteResult
    ? `${window.location.origin}/invite/accept?token=${inviteResult.token}`
    : '';

  const inviteTemplate = inviteResult
    ? `${inviterName} is inviting you to join "${workspaceName}" on XentralDesk as a ${role.charAt(0).toUpperCase() + role.slice(1)}.\n\nClick the link below to accept:\n${inviteLink}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail('');
    setRole('support');
    setSelectedPages([]);
    setError(null);
    setInviteResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Invite Team Member</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Send an invite with role & page access</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-accent rounded-xl transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {inviteResult ? (
          /* ── Success State ── */
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-600">Invite sent successfully!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Share the invite link below with <span className="font-bold">{email}</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Invite Message</label>
              <div className="bg-muted/50 border border-border rounded-2xl p-4 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {inviteTemplate}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                copied
                  ? "bg-green-500 text-white"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Invite'}
            </button>
          </div>
        ) : (
          /* ── Form State ── */
          <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-500 font-bold">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-muted/30 border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                />
              </div>
            </div>

            {/* Target Team (Required) */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-primary flex items-center gap-2">
                <Users className="w-3 h-3" />
                Assign to Team
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedTeamId}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-muted/30 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  <option value="">Select a team to inherit permissions...</option>
                  {functionalTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inheritance Notice / Preview */}
            <div className={cn(
              "p-5 rounded-3xl border transition-all space-y-4",
              selectedTeamId 
                ? "bg-primary/5 border-primary/10" 
                : "bg-muted/10 border-dashed border-border opacity-60"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                  selectedTeamId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {selectedTeamId ? <Shield className="w-5 h-5" /> : <LockIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {selectedTeamId ? 'Team Permissions Active' : 'Select a Team'}
                  </h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    {selectedTeamId ? 'Inherited Configuration' : 'Permissions will be inherited'}
                  </p>
                </div>
              </div>
              
              {selectedTeamId ? (
                <>
                  <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p>
                      This member will automatically inherit the <strong>Role</strong> and <strong>Page Access</strong> settings defined for the <span className="font-bold text-foreground">{functionalTeams.find(t => t.id === selectedTeamId)?.name}</span> team.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2">
                    {(functionalTeams.find(t => t.id === selectedTeamId)?.allowed_pages || []).map((page: string) => (
                      <span key={page} className="px-2 py-1 rounded bg-foreground/5 text-[9px] font-bold uppercase tracking-tight text-muted-foreground border border-border/50">
                        {page.replace(/-/g, ' ')}
                      </span>
                    ))}
                    {(functionalTeams.find(t => t.id === selectedTeamId)?.allowed_pages || []).length === 0 && (
                      <span className="px-2 py-1 rounded bg-green-500/5 text-[9px] font-bold uppercase tracking-tight text-green-600 border border-green-500/10">
                        Full Access Enabled
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Choose a team above to automatically configure permissions for this user.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!inviteResult && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 bg-muted/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Strictly Team-Based Invitation
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !email.trim() || !selectedTeamId}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendIcon className="w-3.5 h-3.5" />}
                Send Invite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
