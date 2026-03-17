import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PromptInputBox } from '../../ui/ai-prompt-box';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/src/components/ui/Toast';
import { CallOverlay } from '../ui/CallOverlay';

interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  time: string;
  isAI: boolean;
  status: 'open' | 'closed' | 'pending';
  avatar: string;
  channel: 'website' | 'whatsapp' | 'email' | 'telegram' | 'slack' | 'voice';
}

const conversations: Conversation[] = [
  {
    id: '1',
    customerName: 'Tony Stark',
    lastMessage: 'I need help with my arc reactor billing.',
    time: '2m ago',
    isAI: true,
    status: 'open',
    avatar: 'https://i.pravatar.cc/150?u=tony',
    channel: 'website'
  },
  {
    id: '2',
    customerName: 'Steve Rogers',
    lastMessage: 'Where is my shield delivery?',
    time: '15m ago',
    isAI: false,
    status: 'pending',
    avatar: 'https://i.pravatar.cc/150?u=steve',
    channel: 'whatsapp'
  },
  {
    id: '3',
    customerName: 'Natasha Romanoff',
    lastMessage: 'The tracking number is not working.',
    time: '1h ago',
    isAI: true,
    status: 'open',
    avatar: 'https://i.pravatar.cc/150?u=natasha',
    channel: 'email'
  },
  {
    id: '4',
    customerName: 'Bruce Banner',
    lastMessage: 'How do I manage my gamma radiation levels?',
    time: '3h ago',
    isAI: false,
    status: 'open',
    avatar: 'https://i.pravatar.cc/150?u=bruce',
    channel: 'slack'
  },
  {
    id: '5',
    customerName: 'Thor Odinson',
    lastMessage: 'My hammer is making a weird noise.',
    time: '5h ago',
    isAI: true,
    status: 'pending',
    avatar: 'https://i.pravatar.cc/150?u=thor',
    channel: 'telegram'
  },
  {
    id: '6',
    customerName: 'Wanda Maximoff',
    lastMessage: 'I would like to speak to a human agent.',
    time: '1d ago',
    isAI: false,
    status: 'open',
    avatar: 'https://i.pravatar.cc/150?u=wanda',
    channel: 'voice'
  }
];

interface Message {
  id: string;
  sender: 'customer' | 'ai' | 'human';
  text: string;
  time: string;
  avatar?: string;
  isInternal?: boolean;
}

const initialMessages: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      sender: 'customer',
      text: 'I need help with my arc reactor billing. It seems I was charged twice for the palladium refill.',
      time: '10:42 AM',
      avatar: 'https://i.pravatar.cc/150?u=tony'
    },
    {
      id: 'm2',
      sender: 'ai',
      text: "Hello Mr. Stark! I've looked into your account. It appears there was a duplicate transaction on March 5th. I can initiate a refund for you immediately. Would you like me to proceed?",
      time: '10:43 AM'
    }
  ],
  '2': [
    {
      id: 'm3',
      sender: 'customer',
      text: 'Where is my shield delivery?',
      time: '09:15 AM',
      avatar: 'https://i.pravatar.cc/150?u=steve'
    }
  ],
  '3': [
    {
      id: 'm4',
      sender: 'customer',
      text: 'The tracking number is not working.',
      time: '08:30 AM',
      avatar: 'https://i.pravatar.cc/150?u=natasha'
    }
  ]
};

export const AllConversations = ({ workspaceId }: { workspaceId: string }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [isListOpen, setIsListOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'reply' | 'note'>('reply');
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      {/* Left Panel: Conversation List */}
      <div className={cn(
        "border-r border-border flex flex-col shrink-0 transition-all duration-300 ease-in-out bg-card",
        isListOpen ? "w-80" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-9 pr-4 py-2 bg-accent/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
              <Spinner size="lg" />
              <span className="text-xs font-medium text-muted-foreground">Loading conversations...</span>
            </div>
          ) : (
            conversations.map((chat) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={chat.id}
                onClick={() => {
                  setSelectedId(chat.id);
                  setIsDetailsOpen(true);
                }}
                className={cn(
                  "p-4 cursor-pointer border-b border-border transition-all duration-200 relative group",
                  selectedId === chat.id ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                {chat.id === '1' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary pulse-indicator" />
                )}
                <div className="flex items-center gap-3 mb-1">
                  <img src={chat.avatar} className="w-10 h-10 rounded-full border border-border" alt="" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground truncate">{chat.customerName}</h4>
                      <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {chat.isAI ? (
                        <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-[9px] font-bold uppercase">AI</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold uppercase">Human</span>
                      )}
                      
                      {/* Channel Tag */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent rounded text-[9px] font-bold text-muted-foreground uppercase">
                        {chat.channel === 'website' && <Globe className="w-2.5 h-2.5" />}
                        {chat.channel === 'whatsapp' && <MessageCircle className="w-2.5 h-2.5" />}
                        {chat.channel === 'email' && <Mail className="w-2.5 h-2.5" />}
                        {chat.channel === 'telegram' && <Send className="w-2.5 h-2.5" />}
                        {chat.channel === 'slack' && <Hash className="w-2.5 h-2.5" />}
                        {chat.channel === 'voice' && <Mic className="w-2.5 h-2.5" />}
                        <span>{chat.channel}</span>
                      </div>

                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        chat.status === 'open' ? "bg-green-500" : chat.status === 'pending' ? "bg-yellow-500" : "bg-gray-500"
                      )} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Middle Panel: Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 bg-background/50">
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
            <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/50 backdrop-blur-md z-10">
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
                  <img src={conversations.find(c => c.id === selectedId)?.avatar} className="w-8 h-8 rounded-full border border-border shrink-0" alt="" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{conversations.find(c => c.id === selectedId)?.customerName}</h3>
                    <p className="text-[10px] text-muted-foreground truncate">Active 2m ago</p>
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

                <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-bold hover:opacity-90 transition-all shadow-sm">
                  <Archive className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Close Ticket</span>
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-background/50">
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
                      "flex gap-3 max-w-[80%]",
                      (msg.sender === 'ai' || msg.sender === 'human') && "ml-auto flex-row-reverse",
                      msg.isInternal && "max-w-full w-full justify-center"
                    )}
                  >
                    {msg.isInternal ? (
                      <div className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
                          <Quote className="w-4 h-4 text-black" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">Internal Note • You</span>
                            <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                          </div>
                          <p className="text-sm text-foreground italic">"{msg.text}"</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.sender === 'customer' ? (
                          <img src={msg.avatar} className="w-8 h-8 rounded-full shrink-0" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                            msg.sender === 'ai' ? "bg-primary shadow-primary/20" : "bg-blue-600 shadow-blue-600/20"
                          )}>
                            {msg.sender === 'ai' ? <Bot className="w-5 h-5 text-primary-foreground" /> : <User className="w-5 h-5 text-white" />}
                          </div>
                        )}
                        <div className={cn(
                          "space-y-1",
                          (msg.sender === 'ai' || msg.sender === 'human') && "text-right"
                        )}>
                          <div className={cn(
                            "p-3 rounded-2xl text-sm text-foreground shadow-sm border",
                            msg.sender === 'customer' ? "bg-card border-border rounded-tl-none" : "bg-primary/10 border-primary/20 rounded-tr-none"
                          )}>
                            {msg.text}
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

              {/* Typing Indicator */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-[10px] text-muted-foreground"
              >
                <div className="flex gap-1">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    className="w-1 h-1 bg-muted-foreground rounded-full" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                    className="w-1 h-1 bg-muted-foreground rounded-full" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                    className="w-1 h-1 bg-muted-foreground rounded-full" 
                  />
                </div>
                <span>AI is thinking...</span>
              </motion.div>
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
                onSend={(msg) => {
                  if (!selectedId) return;
                  
                  const newMessage: Message = {
                    id: Date.now().toString(),
                    sender: 'human',
                    text: msg,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isInternal: activeTab === 'note'
                  };

                  setMessages(prev => ({
                    ...prev,
                    [selectedId]: [...(prev[selectedId] || []), newMessage]
                  }));
                }}
                placeholder={activeTab === 'reply' ? "Type a message or use / for commands..." : "Type an internal note (only visible to teammates)..."}
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
        "border-l border-border flex flex-col shrink-0 bg-card transition-all duration-300 ease-in-out z-10",
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
                  <img src={conversations.find(c => c.id === selectedId)?.avatar} className="w-20 h-20 rounded-full border-2 border-border shadow-2xl" alt="" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-card rounded-full" />
                </div>
                <h3 className="text-lg font-bold text-foreground leading-tight">{conversations.find(c => c.id === selectedId)?.customerName}</h3>
                <p className="text-xs text-muted-foreground mt-1">tony@starkindustries.com</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-wider">Customer</span>
                  <span className="px-2 py-0.5 bg-accent text-muted-foreground rounded text-[10px] font-bold uppercase tracking-wider">VIP</span>
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
        participantName={conversations.find(c => c.id === selectedId)?.customerName || 'Customer'}
        participantAvatar={conversations.find(c => c.id === selectedId)?.avatar || ''}
      />
    </div>
  );
};
