import React, { useState } from 'react';
import { X, Mail, Shield, Check, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';

// These match the sidebar view keys — top-level sections only
const PAGE_OPTIONS = [
  { key: 'all-conversations', label: 'Inbox', section: 'Inbox' },
  { key: 'people', label: 'People & CRM', section: 'Customers' },
  { key: 'csat', label: 'CSAT & Sentiment', section: 'Customers' },
  { key: 'outbound', label: 'Campaigns', section: 'Outbound' },
  { key: 'analyze', label: 'Analyze', section: 'AI Agent' },
  { key: 'train', label: 'Train Agent', section: 'AI Agent' },
  { key: 'test', label: 'Test', section: 'AI Agent' },
  { key: 'website-chat', label: 'Website Chat', section: 'Channels' },
  { key: 'email', label: 'Email', section: 'Channels' },
  { key: 'whatsapp', label: 'WhatsApp', section: 'Channels' },
  { key: 'instagram', label: 'Instagram', section: 'Channels' },
  { key: 'facebook', label: 'Facebook', section: 'Channels' },
  { key: 'telegram', label: 'Telegram', section: 'Channels' },
  { key: 'discord', label: 'Discord', section: 'Channels' },
  { key: 'slack', label: 'Slack', section: 'Channels' },
  { key: 'ai-automations', label: 'AI Automations', section: 'Automation' },
  { key: 'macros', label: 'Macros & Snippets', section: 'Automation' },
  { key: 'workflows', label: 'Workflows', section: 'Automation' },
  { key: 'team-members', label: 'Team Members', section: 'Settings' },
  { key: 'business-hours', label: 'Business Hours', section: 'Settings' },
  { key: 'integrations', label: 'Integrations', section: 'Settings' },
  { key: 'chat-widget', label: 'Chat Widget', section: 'Settings' },
  { key: 'billing', label: 'Billing', section: 'Settings' },
  { key: 'api-keys', label: 'API Keys', section: 'Settings' },
];

const ROLES = ['admin', 'manager', 'support'];

const SECTIONS = [...new Set(PAGE_OPTIONS.map(p => p.section))];

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const togglePage = (key: string) => {
    setSelectedPages(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSection = (section: string) => {
    const sectionPages = PAGE_OPTIONS.filter(p => p.section === section).map(p => p.key);
    const allSelected = sectionPages.every(key => selectedPages.includes(key));
    if (allSelected) {
      setSelectedPages(prev => prev.filter(k => !sectionPages.includes(k)));
    } else {
      setSelectedPages(prev => [...new Set([...prev, ...sectionPages])]);
    }
  };

  const selectAll = () => {
    if (selectedPages.length === PAGE_OPTIONS.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(PAGE_OPTIONS.map(p => p.key));
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

            {/* Role */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all",
                      role === r
                        ? "bg-foreground text-background border-foreground shadow-lg"
                        : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Shield className="w-3 h-3" />
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Access */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Page Access</label>
                <button
                  onClick={selectAll}
                  className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                >
                  {selectedPages.length === PAGE_OPTIONS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-3 max-h-[240px] overflow-y-auto no-scrollbar pr-1">
                {SECTIONS.map(section => {
                  const sectionPages = PAGE_OPTIONS.filter(p => p.section === section);
                  const allSelected = sectionPages.every(p => selectedPages.includes(p.key));
                  const someSelected = sectionPages.some(p => selectedPages.includes(p.key));

                  return (
                    <div key={section} className="space-y-1">
                      <button
                        onClick={() => toggleSection(section)}
                        className="flex items-center gap-2 w-full text-left px-2 py-1"
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                          allSelected ? "bg-primary border-primary" : someSelected ? "border-primary bg-primary/20" : "border-border"
                        )}>
                          {(allSelected || someSelected) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">{section}</span>
                      </button>

                      <div className="ml-6 space-y-0.5">
                        {sectionPages.map(page => (
                          <button
                            key={page.key}
                            onClick={() => togglePage(page.key)}
                            className="flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-xl hover:bg-muted/30 transition-colors"
                          >
                            <div className={cn(
                              "w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all shrink-0",
                              selectedPages.includes(page.key) ? "bg-primary border-primary" : "border-border"
                            )}>
                              {selectedPages.includes(page.key) && <Check className="w-2 h-2 text-primary-foreground" />}
                            </div>
                            <span className="text-xs text-foreground">{page.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!inviteResult && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">
              {selectedPages.length === 0 ? 'No pages selected (full access)' : `${selectedPages.length} page${selectedPages.length !== 1 ? 's' : ''} selected`}
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
                disabled={isSubmitting || !email.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Send Invite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
