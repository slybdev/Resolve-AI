import React, { useState } from 'react';
import { X, Shield, Layout, CheckCircle2, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { api } from '../../../lib/api';

interface FunctionalTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess: () => void;
  initialTeam?: any; // New prop for editing
}

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

export const FunctionalTeamModal = ({ isOpen, onClose, workspaceId, onSuccess, initialTeam }: FunctionalTeamModalProps) => {
  const [name, setName] = useState(initialTeam?.name || '');
  const [description, setDescription] = useState(initialTeam?.description || '');
  const [selectedPages, setSelectedPages] = useState<string[]>(initialTeam?.allowed_pages || []);

  React.useEffect(() => {
    if (initialTeam) {
      setName(initialTeam.name);
      setDescription(initialTeam.description || '');
      setSelectedPages(initialTeam.allowed_pages || []);
    } else if (isOpen) {
      setName('');
      setDescription('');
      setSelectedPages([]);
    }
  }, [initialTeam, isOpen]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePage = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
    );
  };

  const toggleSection = (sectionId: string) => {
    const section = DASHBOARD_SECTIONS.find(s => s.id === sectionId);
    if (!section) return;

    const pageIds = section.pages.map(p => p.id);
    const allSelected = pageIds.every(id => selectedPages.includes(id));

    if (allSelected) {
      setSelectedPages(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedPages(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (initialTeam) {
        await api.team.updateFunctionalTeam(workspaceId, initialTeam.id, {
          name,
          description,
          allowed_pages: selectedPages
        });
      } else {
        await api.team.createFunctionalTeam(workspaceId, {
          name,
          description,
          allowed_pages: selectedPages
        });
      }
      onSuccess();
      onClose();
      setName('');
      setDescription('');
      setSelectedPages([]);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {initialTeam ? 'Edit Functional Team' : 'Create Functional Team'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {initialTeam ? 'Update group name and permissions.' : 'Define specialized groups with restricted access.'}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Team Name</label>
                      <input 
                        required
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sales, Technical Support"
                        className="w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Description</label>
                      <textarea 
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is this team responsible for?"
                        className="w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Page Permissions</label>
                    <div className="space-y-6 max-h-[400px] overflow-y-auto no-scrollbar pr-1 pb-4">
                      {DASHBOARD_SECTIONS.map((section) => {
                        const sectionPageIds = section.pages.map(p => p.id);
                        const allSelected = sectionPageIds.every(id => selectedPages.includes(id));
                        const someSelected = sectionPageIds.some(id => selectedPages.includes(id));

                        return (
                          <div key={section.id} className="space-y-3">
                            <div 
                              onClick={() => toggleSection(section.id)}
                              className="flex items-center justify-between px-2 cursor-pointer group"
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                                {section.label}
                              </span>
                              <div className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full transition-all",
                                allSelected ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground group-hover:text-foreground"
                              )}>
                                {allSelected ? 'ALL SELECTED' : someSelected ? 'PARTIAL' : 'SELECT ALL'}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-1.5 pl-2">
                              {section.pages.map((page) => (
                                <button
                                  key={page.id}
                                  type="button"
                                  onClick={() => togglePage(page.id)}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                    selectedPages.includes(page.id) 
                                      ? "bg-primary/5 border-primary text-primary" 
                                      : "bg-accent/30 border-border/50 text-muted-foreground hover:border-border hover:bg-accent/50"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <Layout className="w-3.5 h-3.5 opacity-50" />
                                    <span className="text-[11px] font-bold tracking-tight">{page.label}</span>
                                  </div>
                                  {selectedPages.includes(page.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3 text-xs text-primary leading-relaxed">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <p>
                    <strong>Admin Note:</strong> Workspace Owners and Admins always have full access regardless of team assignments. 
                    These restrictions will only apply to <strong>Agent</strong> and <strong>Member</strong> roles.
                  </p>
                </div>

                {error && <div className="text-red-500 text-xs font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="flex-1 px-6 py-4 bg-accent text-foreground rounded-2xl text-sm font-bold hover:bg-border transition-colors uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !name.trim()}
                    className="flex-[2] px-6 py-4 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-xl shadow-primary/20 uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    {initialTeam ? 'Update Team' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
