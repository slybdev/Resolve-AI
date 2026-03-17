import React, { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import { Sidebar } from './dashboard/Sidebar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AllConversations } from './dashboard/pages/AllConversations';
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
import { TelegramChannel } from './dashboard/pages/channels/TelegramChannel';
import { SlackChannel } from './dashboard/pages/channels/SlackChannel';
import { VoiceAIChannel } from './dashboard/pages/channels/VoiceAIChannel';
import { CommandPalette } from './dashboard/CommandPalette';

const Dashboard = () => {
  const [currentView, setCurrentView] = useState('all-conversations');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setIsInitialLoading(true);
    try {
      const workspaces = await api.workspaces.list();
      if (workspaces && workspaces.length > 0) {
        setWorkspaceId(workspaces[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
      case 'all-conversations': return <AllConversations workspaceId={workspaceId} />;
      case 'assigned-to-me': return <AssignedToMe workspaceId={workspaceId} />;
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
      case 'telegram': return <TelegramChannel workspaceId={workspaceId} />;
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
      case 'prompt-editor': return <PromptEditor workspaceId={workspaceId} />;
      case 'ai-settings': return <AISettings workspaceId={workspaceId} />;
      case 'team-members': return <TeamMembers workspaceId={workspaceId} />;
      case 'business-hours': return <BusinessHours workspaceId={workspaceId} />;
      case 'integrations': return <Integrations workspaceId={workspaceId} />;
      case 'chat-widget': return <ChatWidget workspaceId={workspaceId} />;
      case 'billing': return <Billing workspaceId={workspaceId} />;
      case 'api-keys': return <APIKeys workspaceId={workspaceId} />;
      default: return <AllConversations workspaceId={workspaceId} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans relative">
      <div className={cn(
        "transition-all duration-300 ease-in-out flex shrink-0 overflow-hidden border-r border-white/5",
        isSidebarOpen ? "w-64" : "w-16"
      )}>
        <Sidebar 
          currentView={currentView} 
          onViewChange={handleViewChange} 
          isCollapsed={!isSidebarOpen} 
          onToggle={toggleSidebar}
        />
      </div>

      <main className="flex-1 h-full overflow-hidden relative">
        {renderView()}
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
