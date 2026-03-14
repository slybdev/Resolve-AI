import React, { useState } from 'react';
import { AnalyticsOverview } from './AnalyticsOverview';
import { ConversationsAnalytics } from './ConversationsAnalytics';
import { AgentPerformance } from './AgentPerformance';
import { AIPerformance } from './AIPerformance';
import { cn } from '@/src/lib/utils';
import { motion } from 'framer-motion';

export const Analyze = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'conversations', label: 'Conversations' },
    { id: 'agent-performance', label: 'Agent Performance' },
    { id: 'ai-performance', label: 'AI Performance' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <AnalyticsOverview />;
      case 'conversations': return <ConversationsAnalytics />;
      case 'agent-performance': return <AgentPerformance />;
      case 'ai-performance': return <AIPerformance />;
      default: return <AnalyticsOverview />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="px-8 pt-4 border-b border-border bg-card/50 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">Analyze</h1>
          <div className="flex items-center gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-4 text-sm font-bold transition-all relative",
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="analyze-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};
