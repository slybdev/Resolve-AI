import React, { useState, useEffect } from 'react';
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

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderView = () => {
    switch (currentView) {
      case 'all-conversations': return <AllConversations />;
      case 'assigned-to-me': return <AssignedToMe />;
      case 'unassigned': return <Unassigned />;
      case 'urgent-sla': return <UrgentSLA />;
      case 'people': return <People />;
      case 'csat': return <CSAT />;
      case 'outbound': return <Outbound />;
      case 'product-tours': return <Outbound />;
      case 'news': return <News />;
      case 'help-center': return <HelpCenter />;
      case 'website-chat': return <WebsiteChatChannel />;
      case 'email': return <EmailChannel />;
      case 'whatsapp': return <WhatsAppChannel />;
      case 'telegram': return <TelegramChannel />;
      case 'slack': return <SlackChannel />;
      case 'voice-ai': return <VoiceAIChannel />;
      case 'ai-automations': return <AIAutomations />;
      case 'macros': return <Macros />;
      case 'workflows': return <Workflows />;
      case 'escalations': return <Escalations />;
      case 'analyze': return <Analyze />;
      case 'train': return <Train />;
      case 'test': return <Test />;
      case 'deploy': return <ComingSoon title="Deploy Agent" />;
      case 'prompt-editor': return <PromptEditor />;
      case 'ai-settings': return <AISettings />;
      case 'team-members': return <TeamMembers />;
      case 'business-hours': return <BusinessHours />;
      case 'integrations': return <Integrations />;
      case 'chat-widget': return <ChatWidget />;
      case 'billing': return <Billing />;
      case 'api-keys': return <APIKeys />;
      default: return <AllConversations />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans relative">
      <div className={cn(
        "transition-all duration-300 ease-in-out flex shrink-0 overflow-hidden",
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
