import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Clock, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ConversationHistoryItem {
  conversation_id: string;
  last_message: string | null;
  last_message_at: string | null;
  status: string;
  has_active_ticket: boolean;
  updated_at: string;
}

interface WidgetHomeScreenProps {
  title: string;
  primaryColor: string;
  theme: 'light' | 'dark';
  conversations: ConversationHistoryItem[];
  onStartNewChat: () => void;
  onResumeConversation: (conversationId: string) => void;
  onClose: () => void;
  isConnected: boolean;
  avatar?: string;
  baseUrl: string;
}

export const WidgetHomeScreen = ({
  title,
  primaryColor,
  theme,
  conversations,
  onStartNewChat,
  onResumeConversation,
  onClose,
  isConnected,
  avatar,
  baseUrl
}: WidgetHomeScreenProps) => {

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="p-6 pb-8 relative overflow-hidden shrink-0"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
      >
        <div className="absolute inset-0 backdrop-blur-xl bg-white/5" />
        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-20 h-20 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {avatar ? (
                  <img src={avatar} alt="" className="w-12 h-12 rounded-full border-2 border-white/20" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 transition-colors",
                  isConnected ? "bg-green-400 border-white/50" : "bg-red-400 border-white/50"
                )} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                  {isConnected ? 'Online' : 'Connecting...'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-white transition-all hover:rotate-90"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-sm text-white/80 font-medium">
            👋 Hi there! How can we help you today?
          </p>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar",
        theme === 'dark' ? "bg-[#1a1c1e]" : "bg-slate-50/50"
      )}>
        {/* Start New Chat Card */}
        <div>
          <p className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-1",
            theme === 'dark' ? "text-slate-500" : "text-slate-400"
          )}>
            Start a new chat
          </p>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartNewChat}
            className={cn(
              "w-full p-4 rounded-2xl border flex items-center gap-4 text-left transition-all group",
              theme === 'dark' 
                ? "bg-slate-800/60 border-slate-700 hover:border-slate-600" 
                : "bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md"
            )}
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
            >
              <Send className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-bold truncate",
                theme === 'dark' ? "text-slate-200" : "text-slate-800"
              )}>
                Chat with {title}
              </p>
              <p className={cn(
                "text-[11px] mt-0.5",
                theme === 'dark' ? "text-slate-500" : "text-slate-400"
              )}>
                We typically reply in a few minutes
              </p>
            </div>
            <ChevronRight className={cn(
              "w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1",
              theme === 'dark' ? "text-slate-600" : "text-slate-300"
            )} />
          </motion.button>
        </div>

        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <div>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-1",
              theme === 'dark' ? "text-slate-500" : "text-slate-400"
            )}>
              Recent conversations
            </p>
            <div className="space-y-2">
              {conversations.map((conv, idx) => (
                <motion.button
                  key={conv.conversation_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onResumeConversation(conv.conversation_id)}
                  className={cn(
                    "w-full p-3.5 rounded-xl border flex items-center gap-3 text-left transition-all group",
                    theme === 'dark' 
                      ? "bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60" 
                      : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                    theme === 'dark' ? "bg-slate-700" : "bg-slate-100"
                  )}>
                    <MessageCircle className={cn(
                      "w-4 h-4",
                      theme === 'dark' ? "text-slate-400" : "text-slate-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[13px] font-semibold truncate",
                      theme === 'dark' ? "text-slate-300" : "text-slate-700"
                    )}>
                      {conv.last_message || 'No messages yet'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className={cn(
                        "w-3 h-3",
                        theme === 'dark' ? "text-slate-600" : "text-slate-400"
                      )} />
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        theme === 'dark' ? "text-slate-600" : "text-slate-400"
                      )}>
                        {conv.last_message_at ? formatTimeAgo(conv.last_message_at) : 'Unknown'}
                      </span>
                      {conv.has_active_ticket && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1",
                    theme === 'dark' ? "text-slate-700" : "text-slate-300"
                  )} />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        "p-3 border-t shrink-0",
        theme === 'dark' ? "bg-[#1a1c1e] border-slate-800/60" : "bg-white border-slate-100"
      )}>
        <div className="flex items-center justify-center gap-1.5 py-1 opacity-20 grayscale hover:opacity-60 transition-all cursor-default group">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Powered by</span>
          <span className="text-[9px] font-black tracking-tight text-primary uppercase group-hover:scale-110 transition-transform">XentralDesk</span>
        </div>
      </div>
    </div>
  );
};
