import React, { useState } from 'react';
import { KnowledgeBase as Intelligence } from './KnowledgeBase';
import { Playbook } from './Playbook';
import { Protocols } from './Protocols';
import { cn } from '@/src/lib/utils';
import { motion } from 'framer-motion';

export const Train = ({ workspaceId }: { workspaceId: string }) => {
  const [activeTab, setActiveTab] = useState('intelligence');

  const tabs = [
    { id: 'intelligence', label: 'Intelligence', description: 'What the AI knows' },
    { id: 'playbook', label: 'Playbook', description: 'How the AI behaves' },
    { id: 'protocols', label: 'Protocols', description: 'AI rules & tasks' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'intelligence': return <Intelligence workspaceId={workspaceId} />;
      case 'playbook': return <Playbook workspaceId={workspaceId} />;
      case 'protocols': return <Protocols workspaceId={workspaceId} />;
      default: return <Intelligence workspaceId={workspaceId} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="px-8 pt-8 border-b border-border bg-card/50 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Train Agent</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Agent Learning Active
            </div>
          </div>
          <div className="flex items-center gap-12">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-4 text-sm font-bold transition-all relative group",
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex flex-col items-start">
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-normal opacity-60 group-hover:opacity-100 transition-opacity">
                    {tab.description}
                  </span>
                </div>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="train-tab-indicator"
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
