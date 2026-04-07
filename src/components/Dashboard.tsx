import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/src/lib/api';
import { Sidebar } from './dashboard/Sidebar';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AllConversations } from './dashboard/pages/AllConversations';
import { TicketsDashboard as Tickets } from './dashboard/pages/TicketsDashboard';
import { TicketDetail } from './dashboard/pages/TicketDetail';
import { AssignedToMe } from './dashboard/pages/AssignedToMe';
import { Unassigned } from './dashboard/pages/Unassigned';
import { UrgentSLA } from './dashboard/pages/UrgentSLA';
import { AIAutomations } from './dashboard/pages/AIAutomations';
import { AICalls } from './dashboard/pages/AICalls';
import { Workflows } from './dashboard/pages/Workflows';
import { Escalations } from './dashboard/pages/Escalations';
import { KnowledgeBase } from './dashboard/pages/KnowledgeBase';
import { Documents } from './dashboard/pages/Documents';
import { WebsiteSources } from './dashboard/pages/WebsiteSources';
import { PromptEditor } from './dashboard/pages/PromptEditor';
import { AISettings } from './dashboard/pages/AISettings';
import { ResponseTesting as Test } from './dashboard/pages/ResponseTesting';
import { Analyze } from './dashboard/pages/Analyze';
import { Train } from './dashboard/pages/Train';
import { TeamMembers } from './dashboard/pages/TeamMembers';
import { Integrations } from './dashboard/pages/Integrations';
import { ChatWidget } from './dashboard/pages/ChatWidget';
import { Billing } from './dashboard/pages/Billing';
import { APIKeys } from './dashboard/pages/APIKeys';
import { ComingSoon } from './dashboard/pages/ComingSoon';
import { People } from './dashboard/pages/People';
import { HelpCenter } from './dashboard/pages/HelpCenter';
import { Outbound } from './dashboard/pages/Outbound';
import { Macros } from './dashboard/pages/Macros';
import { CSAT } from './dashboard/pages/CSAT';
import { News } from './dashboard/pages/News';
import { BusinessHours } from './dashboard/pages/BusinessHours';
import { WebsiteChatChannel } from './dashboard/pages/channels/WebsiteChatChannel';
import { EmailChannel } from './dashboard/pages/channels/EmailChannel';
import { WhatsAppChannel } from './dashboard/pages/channels/WhatsAppChannel';
import { InstagramChannel } from './dashboard/pages/channels/InstagramChannel';
import { FacebookChannel } from './dashboard/pages/channels/FacebookChannel';
import { TelegramChannel } from './dashboard/pages/channels/TelegramChannel';
import { DiscordChannel } from './dashboard/pages/channels/DiscordChannel';
import { SlackChannel } from './dashboard/pages/channels/SlackChannel';
import { VoiceAIChannel } from './dashboard/pages/channels/VoiceAIChannel';
import { CommandPalette } from './dashboard/CommandPalette';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'all-conversations';
  });
  const [viewHistory, setViewHistory] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [currentMemberRole, setCurrentMemberRole] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ticket_id');
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('conversation_id');
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Handle OAuth success redirects
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      const view = params.get('view') || 'all-conversations';
      window.history.replaceState({}, document.title, window.location.pathname + "?view=" + view);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      navigate('/login');
      return;
    }
    fetchWorkspaces();
  }, [navigate]);

  const fetchWorkspaces = async () => {
    setIsInitialLoading(true);
    try {
      const workspaces = await api.workspaces.list();
      if (workspaces && workspaces.length > 0) {
        const wsId = workspaces[0].id;
        setWorkspaceId(wsId);
        // Fetch the current user's membership to get allowed_pages
        try {
          const member = await api.team.currentMember(wsId);
          setAllowedPages(member?.allowed_pages || []);
          setCurrentMemberRole(member?.role || null);
        } catch {
          setAllowedPages([]); // Owner / admin — full access
          setCurrentMemberRole('owner'); // Fallback for workspace creator
        }
      }
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleViewChange = (view: string, id?: string) => {
    if (view !== currentView || id !== (view === 'ticket-detail' ? selectedTicketId : selectedConversationId)) {
      setViewHistory(prev => [...prev, currentView]);
      setCurrentView(view);
      
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('view', view);
      
      if (view === 'ticket-detail' && id) {
          setSelectedTicketId(id);
          searchParams.set('ticket_id', id);
          searchParams.delete('conversation_id');
      } else if (view === 'all-conversations' && id) {
          setSelectedConversationId(id);
          searchParams.set('conversation_id', id);
          searchParams.delete('ticket_id');
      } else {
          searchParams.delete('ticket_id');
          searchParams.delete('conversation_id');
          if (view === 'all-conversations') {
              setSelectedConversationId(null);
          }
      }
      
      window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
    }
    setIsSidebarOpen(false);
  };

  const handleBack = () => {
    if (viewHistory.length > 0) {
      const newHistory = [...viewHistory];
      const prevView = newHistory.pop();
      if (prevView) {
        setViewHistory(newHistory);
        setCurrentView(prevView);
        
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('view', prevView);
        if (prevView !== 'ticket-detail') searchParams.delete('ticket_id');
        if (prevView !== 'all-conversations') searchParams.delete('conversation_id');
        window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
      }
    } else {
      if (currentView === 'ticket-detail') {
        handleViewChange('tickets');
      } else {
        handleViewChange('all-conversations');
      }
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const handleLogout = () => {
    api.auth.logout();
    navigate('/login');
  };

  const renderView = () => {
    if (isInitialLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Initializing Workspace...</p>
          </div>
        </div>
      );
    }

    if (!workspaceId) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-background p-8 text-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-2xl font-bold">No Workspace Found</h2>
            <p className="text-muted-foreground">You don't seem to be a member of any workspace. Please complete onboarding or contact your administrator.</p>
            <button 
              onClick={() => window.location.href = '/onboarding'}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold"
            >
              Go to Onboarding
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'all-conversations': return (
        <AllConversations 
          workspaceId={workspaceId} 
          initialConversationId={selectedConversationId} 
          assignedOnly={!allowedPages.length ? false : !allowedPages.includes('all-conversations')}
        />
      );
      case 'tickets': return <Tickets workspaceId={workspaceId} onSelectTicket={(id) => handleViewChange('ticket-detail', id)} />;
      case 'ticket-detail': return <TicketDetail ticketId={selectedTicketId || ""} workspaceId={workspaceId} onBack={handleBack} onViewChange={handleViewChange} />;
      case 'functional-teams': return <TeamMembers workspaceId={workspaceId} currentUserRole={currentMemberRole} />;
      case 'sla-breaches': return <ComingSoon title="SLA Breach Monitoring" />;
      case 'assigned-to-me': return <AssignedToMe workspaceId={workspaceId} onSelectTicket={(id) => handleViewChange('ticket-detail', id)} />;
      case 'unassigned': return <Unassigned workspaceId={workspaceId} />;
      case 'urgent-sla': return <UrgentSLA workspaceId={workspaceId} />;
      case 'people': return <People workspaceId={workspaceId} />;
      case 'csat': return <CSAT workspaceId={workspaceId} />;
      case 'outbound': return <Outbound workspaceId={workspaceId} />;
      case 'product-tours': return <Outbound workspaceId={workspaceId} />;
      case 'news': return <News workspaceId={workspaceId} />;
      case 'help-center': return <HelpCenter workspaceId={workspaceId} />;
      case 'website-chat': return <WebsiteChatChannel workspaceId={workspaceId} />;
      case 'email': return <EmailChannel workspaceId={workspaceId} />;
      case 'whatsapp': return <WhatsAppChannel workspaceId={workspaceId} />;
      case 'instagram': return <InstagramChannel workspaceId={workspaceId} />;
      case 'facebook': return <FacebookChannel workspaceId={workspaceId} />;
      case 'telegram': return <TelegramChannel workspaceId={workspaceId} />;
      case 'discord': return <DiscordChannel workspaceId={workspaceId} />;
      case 'slack': return <SlackChannel workspaceId={workspaceId} />;
      case 'voice-ai': return <VoiceAIChannel workspaceId={workspaceId} />;
      case 'ai-automations': return <AIAutomations workspaceId={workspaceId} />;
      case 'macros': return <Macros workspaceId={workspaceId} />;
      case 'workflows': return <Workflows workspaceId={workspaceId} />;
      case 'escalations': return <Escalations workspaceId={workspaceId} />;
      case 'analyze': return <Analyze workspaceId={workspaceId} />;
      case 'train': return <Train workspaceId={workspaceId} />;
      case 'test': return <Test workspaceId={workspaceId} />;
      case 'deploy': return <ComingSoon title="Deploy Agent" />;
      case 'ai-settings': return <AISettings workspaceId={workspaceId} onViewChange={handleViewChange} />;
      case 'team-members': return <TeamMembers workspaceId={workspaceId} currentUserRole={currentMemberRole} />;
      case 'business-hours': return <BusinessHours workspaceId={workspaceId} />;
      case 'integrations': return <Integrations workspaceId={workspaceId} onViewChange={handleViewChange} />;
      case 'chat-widget': return <ChatWidget workspaceId={workspaceId} />;
      case 'billing': return <Billing workspaceId={workspaceId} />;
      case 'api-keys': return <APIKeys workspaceId={workspaceId} />;
      default: return (
        <AllConversations 
          workspaceId={workspaceId} 
          assignedOnly={!allowedPages.length ? false : !allowedPages.includes('all-conversations')}
        />
      );
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans relative p-2 gap-2">
      <div className={cn(
        "transition-all duration-300 ease-in-out flex shrink-0 overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl bg-card",
        isSidebarOpen ? "w-80" : "w-16"
      )}>
        <Sidebar 
          currentView={currentView} 
          onViewChange={handleViewChange} 
          isCollapsed={!isSidebarOpen} 
          onToggle={toggleSidebar}
          onLogout={handleLogout}
          allowedPages={allowedPages}
        />
      </div>

      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        {viewHistory.length > 0 && currentView !== 'ticket-detail' && (
          <div className="px-8 pt-4 pb-0 flex items-center justify-start z-10">
            <button 
              onClick={handleBack}
              className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all border border-transparent hover:border-border shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back</span>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
          {renderView()}
        </div>
      </main>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        onSelect={handleViewChange}
      />
    </div>
  );
};

export default Dashboard;
