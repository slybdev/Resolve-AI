import React, { useState } from 'react';
import { 
  Inbox, 
  UserCheck, 
  Users, 
  AlertCircle, 
  Zap, 
  GitBranch, 
  ArrowUpRight, 
  BookOpen, 
  FileText, 
  Globe, 
  Facebook,
  Cpu, 
  Sliders, 
  TestTube, 
  LayoutDashboard, 
  MessageSquare, 
  User, 
  Bot, 
  PhoneCall,
  Layers, 
  MessageCircle, 
  CreditCard, 
  Key,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Mail,
  Send,
  Hash,
  Mic,
  BarChart,
  GraduationCap,
  Rocket,
  Brain,
  Share2,
  Terminal,
  Megaphone,
  Star,
  Clock,
  Instagram,
  Settings,
  LogOut
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick: () => void;
  indent?: boolean;
  isCollapsed?: boolean;
}

const NavItem = ({ icon: Icon, label, active = false, onClick, indent = false, isCollapsed = false }: NavItemProps) => (
  <motion.div 
    whileHover={{ x: isCollapsed ? 0 : 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-full cursor-pointer transition-all duration-300 group relative overflow-hidden mb-1",
      active 
        ? "bg-foreground text-background shadow-lg shadow-foreground/10" 
        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      indent && !isCollapsed && "ml-4",
      isCollapsed && "justify-center px-0"
    )}
    title={isCollapsed ? label : undefined}
  >
    <Icon className={cn("w-4 h-4 relative z-10", active ? "text-background" : "text-muted-foreground group-hover:text-foreground")} />
    {!isCollapsed && <span className="text-xs font-bold relative z-10 transition-colors tracking-tight">{label}</span>}
  </motion.div>
);

interface SidebarSectionProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const SidebarSection = ({ title, icon: Icon, children, defaultOpen = false, isCollapsed = false, onToggle }: SidebarSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isCollapsed) {
    return (
      <div className="mb-2 flex flex-col items-center">
        <button 
          onClick={onToggle}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-200 group"
          title={title}
        >
          <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <motion.div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors group mb-1"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 opacity-50" />
        </motion.div>
      </motion.div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="mt-1 space-y-0.5 ml-2 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
}

export const Sidebar = ({ currentView, onViewChange, isCollapsed = false, onToggle, onLogout }: SidebarProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn(
      "h-full bg-card/60 backdrop-blur-xl dark:bg-card/60 dark:backdrop-blur-xl flex flex-col items-center py-4 shrink-0 overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300",
      "light:bg-card light:backdrop-blur-none", // Explicit solid white in light mode
      isCollapsed ? "w-16" : "w-80"
    )}>
      <div className={cn("mb-6 w-full", isCollapsed && "flex flex-col items-center")}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={onToggle}
          className={cn(
            "bg-foreground rounded-2xl flex items-center justify-center shadow-xl shadow-foreground/5 transition-all duration-300 cursor-pointer",
            isCollapsed ? "w-12 h-12 mb-4" : "w-12 h-12 mb-6 mx-4"
          )}
        >
          <Bot className="text-background w-7 h-7" />
        </motion.div>
        
        <SidebarSection title="Inbox" icon={Inbox} isCollapsed={isCollapsed} onToggle={onToggle} defaultOpen={true}>
          <NavItem icon={Inbox} label="All Conversations" active={currentView === 'all-conversations'} onClick={() => onViewChange('all-conversations')} isCollapsed={isCollapsed} />
          <NavItem icon={UserCheck} label="Assigned to Me" active={currentView === 'assigned-to-me'} onClick={() => onViewChange('assigned-to-me')} isCollapsed={isCollapsed} />
          <NavItem icon={Users} label="Unassigned" active={currentView === 'unassigned'} onClick={() => onViewChange('unassigned')} isCollapsed={isCollapsed} />
          <NavItem icon={AlertCircle} label="Urgent / SLA" active={currentView === 'urgent-sla'} onClick={() => onViewChange('urgent-sla')} isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection title="Customers" icon={Users} isCollapsed={isCollapsed} onToggle={onToggle}>
          <NavItem icon={Users} label="People & CRM" active={currentView === 'people'} onClick={() => onViewChange('people')} isCollapsed={isCollapsed} />
          <NavItem icon={Star} label="CSAT & Sentiment" active={currentView === 'csat'} onClick={() => onViewChange('csat')} isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection title="Outbound" icon={Megaphone} isCollapsed={isCollapsed} onToggle={onToggle}>
          <NavItem icon={Megaphone} label="Campaigns" active={currentView === 'outbound'} onClick={() => onViewChange('outbound')} isCollapsed={isCollapsed} />
          <NavItem icon={LayoutDashboard} label="Product Tours" active={currentView === 'product-tours'} onClick={() => onViewChange('product-tours')} isCollapsed={isCollapsed} />
          <NavItem icon={Megaphone} label="News & Updates" active={currentView === 'news'} onClick={() => onViewChange('news')} isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection title="AI Agent" icon={Bot} isCollapsed={isCollapsed} onToggle={onToggle}>
          <NavItem icon={BarChart} label="Analyze" active={currentView === 'analyze'} onClick={() => onViewChange('analyze')} isCollapsed={isCollapsed} />
          <NavItem icon={GraduationCap} label="Train Agent" active={currentView === 'train'} onClick={() => onViewChange('train')} isCollapsed={isCollapsed} />
          <NavItem icon={BookOpen} label="Public Help Center" active={currentView === 'help-center'} onClick={() => onViewChange('help-center')} isCollapsed={isCollapsed} />
          <NavItem icon={TestTube} label="Test" active={currentView === 'test'} onClick={() => onViewChange('test')} isCollapsed={isCollapsed} />
          <NavItem icon={Rocket} label="Deploy" active={currentView === 'deploy'} onClick={() => onViewChange('deploy')} isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection title="Channels" icon={Share2} isCollapsed={isCollapsed} onToggle={onToggle}>
          <NavItem icon={Globe} label="Website Chat" active={currentView === 'website-chat'} onClick={() => onViewChange('website-chat')} isCollapsed={isCollapsed} />
          <NavItem icon={Mail} label="Email" active={currentView === 'email'} onClick={() => onViewChange('email')} isCollapsed={isCollapsed} />
          <NavItem icon={MessageCircle} label="WhatsApp" active={currentView === 'whatsapp'} onClick={() => onViewChange('whatsapp')} isCollapsed={isCollapsed} />
          <NavItem icon={Instagram} label="Instagram" active={currentView === 'instagram'} onClick={() => onViewChange('instagram')} isCollapsed={isCollapsed} />
          <NavItem icon={Facebook} label="Facebook Messenger" active={currentView === 'facebook'} onClick={() => onViewChange('facebook')} isCollapsed={isCollapsed} />
          <NavItem icon={Send} label="Telegram" active={currentView === 'telegram'} onClick={() => onViewChange('telegram')} isCollapsed={isCollapsed} />
          <NavItem icon={Hash} label="Slack" active={currentView === 'slack'} onClick={() => onViewChange('slack')} isCollapsed={isCollapsed} />
          <NavItem icon={Mic} label="Voice AI" active={currentView === 'voice-ai'} onClick={() => onViewChange('voice-ai')} isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection title="Automation" icon={Zap} isCollapsed={isCollapsed} onToggle={onToggle}>
          <NavItem icon={Bot} label="AI Automations" active={currentView === 'ai-automations'} onClick={() => onViewChange('ai-automations')} isCollapsed={isCollapsed} />
          <NavItem icon={Zap} label="Macros & Snippets" active={currentView === 'macros'} onClick={() => onViewChange('macros')} isCollapsed={isCollapsed} />
          <NavItem icon={ArrowUpRight} label="Escalations" active={currentView === 'escalations'} onClick={() => onViewChange('escalations')} isCollapsed={isCollapsed} />
          <NavItem icon={GitBranch} label="Workflows" active={currentView === 'workflows'} onClick={() => onViewChange('workflows')} isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection title="Settings" icon={Sliders} isCollapsed={isCollapsed} onToggle={onToggle}>
          <NavItem icon={Users} label="Team Members" active={currentView === 'team-members'} onClick={() => onViewChange('team-members')} isCollapsed={isCollapsed} />
          <NavItem icon={Clock} label="Business Hours & SLA" active={currentView === 'business-hours'} onClick={() => onViewChange('business-hours')} isCollapsed={isCollapsed} />
          <NavItem icon={Layers} label="Integrations" active={currentView === 'integrations'} onClick={() => onViewChange('integrations')} isCollapsed={isCollapsed} />
          <NavItem icon={MessageCircle} label="Chat Widget" active={currentView === 'chat-widget'} onClick={() => onViewChange('chat-widget')} isCollapsed={isCollapsed} />
          <NavItem icon={CreditCard} label="Billing" active={currentView === 'billing'} onClick={() => onViewChange('billing')} isCollapsed={isCollapsed} />
          <NavItem icon={Key} label="API Keys" active={currentView === 'api-keys'} onClick={() => onViewChange('api-keys')} isCollapsed={isCollapsed} />
          <NavItem 
            icon={LogOut} 
            label="Logout" 
            onClick={() => onLogout?.()} 
            isCollapsed={isCollapsed}
          />
        </SidebarSection>
      </div>

      <div className={cn("mt-auto pt-6 border-t border-border space-y-4 w-full", isCollapsed && "flex flex-col items-center")}>
        <div className={cn("flex items-center justify-between px-4 w-full", isCollapsed && "flex-col gap-4 px-0")}>
          {!isCollapsed && <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-50">XentralDesk v0.12</p>}
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground transition-all duration-200 btn-press"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
