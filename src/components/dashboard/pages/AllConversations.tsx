import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Search, 
  MoreHorizontal, 
  User, 
  Mail, 
  Tag, 
  ChevronDown, 
  Paperclip, 
  Send,
  ShieldCheck,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layout,
  MessageSquare,
  Phone,
  Video,
  MoreVertical,
  Star,
  Moon,
  X,
  Ticket,
  Archive,
  Globe,
  MessageCircle,
  Hash,
  Sparkles,
  History,
  Lightbulb,
  Zap,
  Quote,
  Mic,
  ArrowRight,
  Lock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PromptInputBox } from '../../ui/ai-prompt-box';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/src/components/ui/Toast';
import { CallOverlay } from '../ui/CallOverlay';
import { api } from '@/src/lib/api';

const renderMessageText = (text: string) => {
  if (!text) return null;
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)|(https?:\/\/[^\s\)]+)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      parts.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">
          {match[1].length > 50 ? 'Link' : match[1]}
        </a>
      );
    } else if (match[3]) {
      parts.push(
        <a key={match.index} href={match[3]} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">
          Link
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const ExpandableMessage = ({ text, sender }: { text: string; sender: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 700;
  
  if (!text) return null;
  
  const shouldTruncate = text.length > maxLength;
  const displayedText = (shouldTruncate && !isExpanded) 
    ? text.slice(0, maxLength) 
    : text;

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(
        "whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
        shouldTruncate && !isExpanded && "max-h-[400px] overflow-hidden relative"
      )}>
        {renderMessageText(displayedText)}
        {shouldTruncate && !isExpanded && (
          <>
            <span className="opacity-50">...</span>
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-20 pointer-events-none",
              sender === 'customer' 
                ? "bg-gradient-to-t from-blue-500/10 to-transparent" 
                : "bg-gradient-to-t from-background/40 to-transparent"
            )} />
          </>
        )}
      </div>
      {shouldTruncate && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={cn(
            "text-[10px] font-black uppercase tracking-widest hover:underline w-fit py-1 px-2 rounded-md transition-colors",
            sender === 'customer' ? "text-blue-400 hover:bg-blue-400/10" : "text-primary hover:bg-primary/10"
          )}
        >
          {isExpanded ? "Show Less" : "View More Content"}
        </button>
      )}
    </div>
  );
};

interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  time: string;
  isAI: boolean;
  status: 'open' | 'closed' | 'pending';
  avatar: string;
  channel: 'website' | 'whatsapp' | 'email' | 'telegram' | 'slack' | 'voice' | 'unknown';
}

interface Message {
  id: string;
  sender: 'customer' | 'ai' | 'human' | 'agent' | 'system';
  text: string;
  attachmentUrl?: string;
  type?: string;
  time: string;
  avatar?: string;
  isInternal?: boolean;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
};

import { LetterAvatar } from '../../ui/Avatar';


const VideoMessage = ({ url, sender }: { url: string; sender: string }) => {
  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden min-w-[200px] max-w-sm shadow-lg border group",
      sender === 'customer' ? "border-border" : "border-primary/20"
    )}>
      <video src={url} className="w-full h-auto" controls />
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
          <div className="ml-1 border-y-[8px] border-y-transparent border-l-[14px] border-l-white" />
        </div>
      </div>
    </div>
  );
};

const VoiceMessage = ({ url, sender, time }: { url: string; sender: string; time: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  return (
    <div className={cn(
      "flex flex-col gap-1 p-3 rounded-2xl min-w-[260px] shadow-lg border relative overflow-hidden backdrop-blur-md",
      sender === 'customer' 
        ? "bg-blue-500/20 dark:bg-blue-500/40 border-blue-500/30 dark:border-blue-400/20 text-bubble-customer" 
        : "bg-zinc-100 dark:bg-black/60 border-zinc-200 dark:border-white/10 text-bubble-agent"
    )}>
      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={togglePlay}
          className="w-11 h-11 flex items-center justify-center transition-all btn-press shrink-0 text-current opacity-90 hover:opacity-100"
        >
          {isPlaying ? (
            <div className="flex gap-[3px] items-center">
              <div className="w-1 h-4 bg-current rounded-full" />
              <div className="w-1 h-4 bg-current rounded-full" />
            </div>
          ) : (
            <div className="ml-1 border-y-[8px] border-y-transparent border-l-[14px] border-l-current" />
          )}
        </button>

        <div className="flex-1 space-y-2">
          <div className="flex items-end gap-[1.5px] h-7 overflow-hidden">
            {[...Array(35)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-[2px] rounded-full transition-all shrink-0",
                  (i / 35) < (currentTime / duration) 
                    ? "bg-[#34b7f1]"
                    : "bg-[#8696a0]"
                )}
                style={{ 
                  height: `${25 + Math.sin(i * 0.4) * 35 + Math.random() * 25}%`
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Removed human icon from VN */}
      </div>

      <div className="flex justify-between items-center mt-1 px-1">
        <span className="text-[10px] opacity-70 font-medium whitespace-nowrap">
          {isPlaying ? formatTimeSeconds(currentTime) : formatTimeSeconds(duration)}
        </span>
      </div>
    </div>
  );
};

const formatTimeSeconds = (time: number) => {
  if (isNaN(time)) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const CollapsibleNote = ({ msg }: { msg: Message }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      layout
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
      className={cn(
        "cursor-pointer transition-all duration-300 group flex items-start",
        isExpanded ? "w-full" : "w-fit"
      )}
    >
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all shadow-sm",
        isExpanded 
          ? "bg-amber-500/5 border-amber-500/20 w-full p-4 rounded-xl flex-col items-start gap-3" 
          : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30"
      )}>
        <div className="flex items-center gap-2 w-full">
          <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
            <Lock className="w-3 h-3 text-black" />
          </div>
          <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest whitespace-nowrap",
                !isExpanded && "animate-pulse" // Subtle hint
              )}>Private Note</span>
              <div className="w-1 h-1 rounded-full bg-amber-500/30" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase">{msg.time}</span>
            </div>
            {isExpanded && (
              <div className="flex items-center gap-1.5 ml-4">
                <LetterAvatar name="You" size="xs" />
                <span className="text-[9px] text-muted-foreground font-bold">You</span>
              </div>
            )}
            {!isExpanded && (
              <ChevronDown className="w-3 h-3 text-amber-500/50 group-hover:translate-y-0.5 transition-transform" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="w-full">
            <p className="text-xs text-foreground italic leading-relaxed border-l-2 border-amber-500/30 pl-3">
              {msg.text}
            </p>
            <div className="flex justify-end mt-2">
               <span className="text-[8px] text-amber-500/50 uppercase font-black">Click to collapse</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const AllConversations = ({ workspaceId }: { workspaceId: string }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [isListOpen, setIsListOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'reply' | 'note'>('reply');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowScrollButton(false);
    }
  };

  // Handle switching conversations
  useEffect(() => {
    if (selectedId) {
      // Use short timeout to ensure DOM is ready
      setTimeout(scrollToBottom, 50);
      prevMsgCountRef.current = messages[selectedId]?.length || 0;
    }
  }, [selectedId]);

  // Handle new messages within same conversation
  useEffect(() => {
    if (selectedId) {
      const currentMessages = messages[selectedId] || [];
      const msgCount = currentMessages.length;
      
      if (msgCount > prevMsgCountRef.current) {
        const lastMessage = currentMessages[msgCount - 1];
        const isAgentMessage = lastMessage?.sender === 'ai' || lastMessage?.sender === 'human';

        // Auto-scroll only if user is already at the bottom or if the message is from the agent/AI
        if (isAgentMessage || !showScrollButton) {
          setTimeout(scrollToBottom, 50);
        }
      }
      prevMsgCountRef.current = msgCount;
    }
  }, [messages[selectedId]]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Show button if scrolled up more than 150px
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollButton(isScrolledUp);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [workspaceId]);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      const interval = setInterval(() => fetchMessages(selectedId), 3000); // Poll messages every 3s
      return () => clearInterval(interval);
    }
  }, [selectedId]);

  const fetchConversations = async () => {
    try {
      const data = await api.conversations.list(workspaceId);
      setConversationsList(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const data = await api.conversations.getMessages(id);
      const mappedMessages: Message[] = data.map((m: any) => {
        const dateStr = m.created_at.endsWith('Z') || m.created_at.includes('+') ? m.created_at : `${m.created_at}Z`;
        
        // Handle media messages that might have captions in the body
        let text = m.body;
        let attachmentUrl = "";
        
        if (m.message_type !== 'text' && m.message_type !== 'note') {
          // Find the last URL (or /uploads/ path) in the body
          const urlMatch = m.body.match(/(https?:\/\/[^\s]+)$|(\/uploads\/[^\s]+)$/);
          if (urlMatch) {
            attachmentUrl = urlMatch[0];
            text = m.body.replace(attachmentUrl, "").trim().replace(/\n+$/, "");
          } else {
            attachmentUrl = m.body;
            text = "";
          }
        }

        return {
          id: m.id,
          sender: m.sender_type === 'agent' ? 'human' : m.sender_type,
          text: text,
          attachmentUrl: attachmentUrl,
          type: m.message_type,
          time: new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(),
          avatar: m.sender_type === 'customer' ? conversationsList.find(c => c.id === id)?.avatar : undefined,
          isInternal: m.message_type === 'note'
        };
      });
      setMessages(prev => ({ ...prev, [id]: mappedMessages }));
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

    const filteredConversations = conversationsList.filter(chat => {
      const matchesSearch = chat.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || (chat as any).unreadCount > 0;
      return matchesSearch && matchesFilter;
    });

  return (
    <div className="flex h-full w-full overflow-hidden bg-transparent relative gap-2">
      {/* Left Panel: Conversation List */}
      <div className={cn(
        "border border-border flex flex-col shrink-0 transition-all duration-300 ease-in-out bg-card rounded-2xl",
        isListOpen ? "w-80" : "w-0 overflow-hidden"
      )}>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search or start a new chat" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-accent/50 hover:bg-accent/70 border border-zinc-200 dark:border-transparent rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button 
              onClick={() => setFilterType('all')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                filterType === 'all' ? "bg-primary/10 text-primary" : "bg-accent/50 text-muted-foreground hover:bg-accent"
              )}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType('unread')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                filterType === 'unread' ? "bg-primary/10 text-primary" : "bg-accent/50 text-muted-foreground hover:bg-accent"
              )}
            >
              Unread
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
              <Spinner size="lg" />
              <span className="text-xs font-medium text-muted-foreground">Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center opacity-50">
              <Search className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">No results found for "{searchTerm}"</p>
            </div>
          ) : (
            filteredConversations.map((chat) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={chat.id}
                onClick={() => {
                  setSelectedId(chat.id);
                  setIsDetailsOpen(true);
                  // Mark as read and update local state optimally
                  api.conversations.markAsRead(chat.id).catch(console.error);
                  setConversationsList(prev => prev.map(c => 
                    c.id === chat.id ? { ...c, unreadCount: 0 } : c
                  ));
                }}
                className={cn(
                  "p-4 cursor-pointer border-b border-border transition-all duration-200 relative group",
                  selectedId === chat.id ? "bg-accent/40 rounded-xl mx-2" : "hover:bg-accent/30 rounded-xl mx-2"
                )}
              >
                <div className="flex items-center gap-3 relative">
                  {/* Status Indicator Bar */}
                  <div className={cn(
                    "absolute -left-4 top-0 bottom-0 w-1 transition-all rounded-r-full",
                    selectedId === chat.id ? "bg-primary" : "bg-transparent group-hover:bg-primary/20"
                  )} />
                  
                  <div className="relative shrink-0">
                    <LetterAvatar name={chat.customerName} size="md" />
                    <div className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                      chat.status === 'open' ? "bg-green-500" : "bg-zinc-400"
                    )} />
                  </div>

                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className={cn(
                        "text-sm font-bold truncate transition-colors",
                        selectedId === chat.id ? "text-primary" : "text-foreground group-hover:text-primary/80"
                      )}>{chat.customerName}</h4>
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0 ml-2">{chat.time}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {(!chat.isAI && chat.channel === 'whatsapp') && (
                          <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                        )}
                        <p className="text-xs text-muted-foreground truncate leading-relaxed">
                          {(() => {
                            const conversationMessages = messages[chat.id] || [];
                            const lastNonInternal = [...conversationMessages].reverse().find(m => !m.isInternal);
                            if (lastNonInternal) {
                              const t = (lastNonInternal as any).type || 'text';
                              if (t === 'image') return 'Photo 📷';
                              if (t === 'voice' || t === 'audio') {
                                const body = lastNonInternal.text || '';
                                let dur = '';
                                if (body.includes('|')) {
                                  try {
                                    const secs = parseInt(body.split('|')[1]);
                                    dur = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')} `;
                                  } catch {}
                                }
                                return `${dur}🎙️ Audio`;
                              }
                              if (t === 'video') return 'Video 🎥';
                              if (t === 'file') return 'File 📄';
                              if (t === 'sticker') return 'Sticker ✨';
                              return lastNonInternal.text || chat.lastMessage;
                            }
                            return chat.lastMessage;
                          })()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {chat.isAI && (
                          <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0" title="AI Managed">
                            <div className="w-2 h-2 rounded-[1px] bg-primary/20" />
                          </div>
                        )}
                        {(chat as any).unreadCount > 0 && (
                          <div className="min-w-[18px] h-[18px] px-1 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-[9px] font-black text-white">{(chat as any).unreadCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 transition-opacity">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/50 rounded text-[8px] font-black text-muted-foreground uppercase tracking-tighter">
                        {chat.channel === 'website' && <Globe className="w-2.5 h-2.5" />}
                        {chat.channel === 'whatsapp' && <MessageCircle className="w-2.5 h-2.5" />}
                        {chat.channel === 'email' && <Mail className="w-2.5 h-2.5" />}
                        {chat.channel === 'telegram' && <Send className="w-2.5 h-2.5" />}
                        {chat.channel === 'slack' && <Hash className="w-2.5 h-2.5" />}
                        {chat.channel === 'voice' && <Mic className="w-2.5 h-2.5" />}
                        <span>{chat.channel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Middle Panel: Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 bg-card border border-border rounded-2xl overflow-hidden">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 bg-card">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No Conversation Selected</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Select a conversation from the list on the left to start chatting with your customers.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => {
                    const newState = !isListOpen;
                    setIsListOpen(newState);
                    if (newState) {
                      setIsCopilotOpen(false);
                    }
                  }}
                  className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-all btn-press shrink-0"
                  title={isListOpen ? "Hide List" : "Show List"}
                >
                  {isListOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div 
                  className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsDetailsOpen(true)}
                  title="Show Customer Details"
                >
                  <LetterAvatar name={conversationsList.find(c => c.id === selectedId)?.customerName || '?'} size="sm" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{conversationsList.find(c => c.id === selectedId)?.customerName}</h3>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-4 shrink-0">
                <button 
                  onClick={() => {
                    const newState = !isCopilotOpen;
                    setIsCopilotOpen(newState);
                    if (newState) {
                      setIsListOpen(false);
                    } else {
                      setIsListOpen(true);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all btn-press",
                    isCopilotOpen ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" : "bg-accent text-muted-foreground border border-border"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copilot</span>
                </button>
                
                <div className="flex items-center gap-1 bg-accent/30 p-1 rounded-full border border-border/50">
                  <button 
                    onClick={() => setIsCallActive(true)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-accent rounded-full text-foreground transition-all"
                    title="Voice Call"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center hover:bg-accent rounded-full text-foreground transition-all">
                    <Moon className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-[11px] font-bold hover:opacity-90 transition-all shadow-sm">
                  <Archive className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Close</span>
                </button>

                {!isDetailsOpen && (
                  <>
                    <div className="w-px h-6 bg-border mx-1" />
                    <button 
                      onClick={() => setIsDetailsOpen(true)}
                      className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-all btn-press"
                      title="Open Customer Details"
                    >
                      <User className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-card relative"
            >
              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToBottom}
                    className="fixed bottom-32 left-1/2 -translate-x-1/2 p-2.5 bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[100] flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-primary-foreground/20"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Jump to End
                  </motion.button>
                )}
              </AnimatePresence>
              <div className="flex justify-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest bg-accent px-3 py-1 rounded-full">Today</span>
              </div>

              <AnimatePresence mode="popLayout">
                {(messages[selectedId] || []).map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      (msg.sender === 'ai' || msg.sender === 'human') && "ml-auto flex-row-reverse",
                      msg.isInternal && "max-w-full w-full justify-center"
                    )}
                  >
                    {msg.isInternal ? (
                      <CollapsibleNote msg={msg} />
                    ) : (
                      <>
                        {msg.sender === 'customer' ? (
                          <LetterAvatar name={conversationsList.find(c => c.id === selectedId)?.customerName || '?'} size="sm" />
                        ) : (
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                            msg.sender === 'ai' ? "bg-white border border-border overflow-hidden" : "bg-blue-600 shadow-blue-600/20"
                          )}>
                            {msg.sender === 'ai' ? (
                              <div className="w-full h-full rounded-full flex items-center justify-center bg-primary/10 border border-primary/20">
                                <div className="w-3 h-3 rounded-[2px] bg-primary/30" />
                              </div>
                            ) : <User className="w-5 h-5 text-white" />}
                          </div>
                        )}
                        <div className={cn(
                          "space-y-1 min-w-0",
                          (msg.sender === 'ai' || msg.sender === 'human') && "text-right"
                        )}>
                          <div className={cn(
                            "rounded-2xl text-sm shadow-lg border overflow-hidden backdrop-blur-md",
                            msg.sender === 'customer' 
                              ? "bg-blue-500/20 dark:bg-blue-500/40 border-blue-500/30 dark:border-blue-400/20 text-bubble-customer rounded-tl-none" 
                              : "bg-zinc-100 dark:bg-black/60 border-zinc-200 dark:border-white/10 text-bubble-agent rounded-tr-none",
                            (msg.type === 'image' || msg.type === 'video') && "p-1"
                          )}>
                            {msg.type === 'image' ? (
                              <div className="relative">
                                {msg.text && (
                                  <div className="p-3 pb-1">
                                    <ExpandableMessage text={msg.text} sender={msg.sender} />
                                  </div>
                                )}
                                <img 
                                  src={msg.attachmentUrl || msg.text} 
                                  className="max-w-full max-h-[350px] object-contain rounded-xl cursor-pointer hover:opacity-95 transition-all" 
                                  alt="Sent image" 
                                  onClick={() => window.open(msg.attachmentUrl || msg.text, '_blank')} 
                                />
                                {/* removed inner timestamp */}
                              </div>
                            ) : msg.type === 'video' ? (
                              <div className="relative">
                                {msg.text && (
                                  <div className="p-3 pb-1">
                                    <ExpandableMessage text={msg.text} sender={msg.sender} />
                                  </div>
                                )}
                                <VideoMessage url={msg.attachmentUrl || msg.text} sender={msg.sender} />
                              </div>
                            ) : msg.type === 'voice' ? (
                              <VoiceMessage url={msg.attachmentUrl || msg.text} sender={msg.sender} time={msg.time} />
                            ) : msg.type === 'file' ? (
                              <div className="p-3">
                                {msg.text && (
                                  <div className="mb-2 p-3">
                                    <ExpandableMessage text={msg.text} sender={msg.sender} />
                                  </div>
                                )}
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => window.open(msg.attachmentUrl || msg.text, '_blank')}>
                                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-red-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate text-current opacity-90">Attachment</p>
                                    <p className="text-[10px] text-current opacity-60 font-medium uppercase tracking-widest">Click to Download</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 text-sm">
                                <ExpandableMessage text={msg.text} sender={msg.sender} />
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 text-[10px] text-muted-foreground",
                            (msg.sender === 'ai' || msg.sender === 'human') ? "justify-end mr-1" : "ml-1"
                          )}>
                            {msg.sender === 'ai' && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                            <span>
                              {msg.sender === 'ai' ? 'AI Assistant' : msg.sender === 'human' ? 'You' : ''} {msg.sender !== 'customer' && '• '} {msg.time}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator removed until real-time status is implemented */}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-border bg-card">
              <div className="flex items-center gap-4 mb-4">
                <button 
                  onClick={() => setActiveTab('reply')}
                  className={cn(
                    "text-xs font-bold transition-all relative pb-1",
                    activeTab === 'reply' ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Reply
                  {activeTab === 'reply' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab('note')}
                  className={cn(
                    "text-xs font-bold transition-all relative pb-1",
                    activeTab === 'note' ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Note
                  {activeTab === 'note' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />}
                </button>
              </div>
              <PromptInputBox 
                onSend={async (msg, files) => {
                  if (!selectedId) return;
                  
                  try {
                    let finalBody = msg;
                    let messageType = "text";

                    console.log('[SendMessage] onSend called:', { msg: msg?.substring(0, 50), filesCount: files?.length, fileTypes: files?.map(f => f.type) });

                    if (files && files.length > 0) {
                      const file = files[0];
                      console.log('[SendMessage] Uploading file:', { name: file.name, type: file.type, size: file.size });
                      
                      try {
                        const uploadRes = await api.uploads.file(file);
                        console.log('[SendMessage] Upload success:', uploadRes);
                        finalBody = uploadRes.url;
                        
                        if (file.type.startsWith('image/')) {
                          messageType = 'image';
                        } else if (file.type.startsWith('video/')) {
                          messageType = 'video';
                        } else if (file.type.startsWith('audio/') || file.type.includes('webm')) {
                          messageType = 'voice';
                        } else {
                          messageType = 'file';
                        }
                      } catch (uploadErr) {
                        console.error('[SendMessage] Upload FAILED:', uploadErr);
                        toast('Error', 'File upload failed', 'error');
                        return;
                      }
                    }

                    if (!finalBody || !finalBody.trim()) {
                      console.warn('[SendMessage] Empty body, skipping send');
                      return;
                    }

                    console.log('[SendMessage] Sending:', { finalBody: finalBody?.substring(0, 80), messageType });
                    await api.conversations.sendMessage(
                      selectedId, 
                      finalBody, 
                      activeTab === 'note',
                      messageType
                    );
                    fetchMessages(selectedId);
                  } catch (err) {
                    toast('Error', 'Failed to send message', 'error');
                    console.error('[SendMessage] Error:', err);
                  }
                }}
                isLoading={isLoading}
                placeholder={activeTab === 'reply' ? "Type a message or use / for commands..." : "Type an internal note (only visible to teammates)..."}
                disableVoice={conversationsList.find(c => c.id === selectedId)?.channel === 'email'}
              />
            </div>
          </>
        )}
      </div>

      {/* AI Copilot Panel */}
      <AnimatePresence>
        {isCopilotOpen && selectedId && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-border flex flex-col shrink-0 bg-card overflow-hidden relative z-20"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-accent/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">AI Copilot</h3>
              </div>
              <button 
                onClick={() => {
                  setIsCopilotOpen(false);
                  setIsListOpen(true);
                }}
                className="p-1.5 hover:bg-accent rounded-md text-muted-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
              {/* Summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <History className="w-3.5 h-3.5" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Conversation Summary</h4>
                </div>
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-2">
                  <p className="text-xs text-foreground leading-relaxed">
                    Customer is inquiring about a duplicate charge for a palladium refill on March 5th.
                  </p>
                  <ul className="text-[10px] text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Issue: Duplicate Billing</li>
                    <li>Amount: $4,200.00</li>
                    <li>Status: Unresolved</li>
                  </ul>
                </div>
              </div>

              {/* Suggested Actions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-3.5 h-3.5" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Suggested Actions</h4>
                </div>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 bg-accent hover:bg-accent/80 border border-border rounded-xl text-xs text-foreground transition-all btn-press flex items-center justify-between group">
                    <span>Issue Full Refund</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                  <button className="w-full text-left p-3 bg-accent hover:bg-accent/80 border border-border rounded-xl text-xs text-foreground transition-all btn-press flex items-center justify-between group">
                    <span>Send Apology Email</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                </div>
              </div>

              {/* Knowledge Base Hits */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Relevant Knowledge</h4>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-accent/50 border border-border rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-foreground">Refund Policy v2.1</span>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">Duplicate charges should be refunded within 3-5 business days...</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Panel: Details */}
      <div className={cn(
        "border border-border flex flex-col shrink-0 bg-card transition-all duration-300 ease-in-out z-10 rounded-2xl",
        isDetailsOpen && selectedId ? "w-80" : "w-0 overflow-hidden"
      )}>
        {selectedId && (
          <>
            <div className="p-6 border-b border-border bg-accent/10 relative">
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-accent rounded-lg text-muted-foreground transition-all z-20"
                title="Close Panel"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <LetterAvatar name={conversationsList.find(c => c.id === selectedId)?.customerName || '?'} size="lg" />
                </div>
                <h3 className="text-lg font-bold text-foreground leading-tight">{conversationsList.find(c => c.id === selectedId)?.customerName}</h3>
                <p className="text-xs text-muted-foreground mt-1">Contact Details</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-wider">Customer</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-2.5 bg-card hover:bg-accent border border-border rounded-xl text-[11px] font-bold text-foreground transition-all btn-press shadow-sm">
                  <User className="w-3.5 h-3.5" />
                  Assign
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 bg-card hover:bg-accent border border-border rounded-xl text-[11px] font-bold text-foreground transition-all btn-press shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Escalate
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
              {/* Tags */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tags</h4>
                  <button className="text-[10px] font-bold text-primary hover:underline">Manage</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold">Billing</span>
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-bold">Priority</span>
                  <button className="px-2.5 py-1 bg-accent/50 text-muted-foreground border border-dashed border-border rounded-lg text-[10px] font-bold hover:bg-accent hover:text-foreground transition-all">
                    + Add Tag
                  </button>
                </div>
              </div>

              {/* AI Suggested Replies */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Suggested Replies</h4>
                </div>
                <div className="space-y-2">
                  {[
                    "Proceed with the refund.",
                    "Ask for more details about the transaction.",
                    "Offer a credit instead of a refund."
                  ].map((reply, i) => (
                    <button key={i} className="w-full text-left p-3.5 bg-accent/30 hover:bg-accent border border-border rounded-xl text-[11px] text-foreground transition-all btn-press group relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

          {/* Knowledge Sources */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Knowledge Sources</h4>
            <div className="space-y-2">
              <div className="p-3 bg-accent border border-border rounded-xl space-y-1 card-hover cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-foreground">Refund Policy v2.1</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">Duplicate charges should be refunded within 3-5 business days...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border space-y-3">
          <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
            Close Conversation
          </button>
        </div>
          </>
        )}
      </div>
      {/* Call Overlay */}
        <CallOverlay 
        isOpen={isCallActive}
        onClose={() => setIsCallActive(false)}
        participantName={conversationsList.find(c => c.id === selectedId)?.customerName || 'Customer'}
        participantAvatar={conversationsList.find(c => c.id === selectedId)?.avatar || ''}
      />
    </div>
  );
};
