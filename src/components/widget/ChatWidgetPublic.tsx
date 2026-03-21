import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Paperclip, Bot, User, Check, MoreHorizontal } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Message {
  id: string;
  sender_type: 'customer' | 'agent' | 'ai' | 'system';
  body: string;
  created_at: string;
  temp_id?: string;
  status?: 'sending' | 'sent' | 'error';
}

interface ChatWidgetProps {
  workspaceId: string;
  primaryColor?: string;
  title?: string;
  welcomeMessage?: string;
  avatar?: string;
  theme?: 'light' | 'dark';
  isPreview?: boolean;
}

export const ChatWidgetPublic = ({ 
  workspaceId, 
  primaryColor: initialColor = '#3b82f6', 
  title: initialTitle = 'Support', 
  welcomeMessage: initialWelcome = 'Hello! How can we help you today?',
  avatar,
  theme: initialTheme = 'light',
  isPreview = false
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(isPreview);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Dynamic Settings
  const [primaryColor, setPrimaryColor] = useState(initialColor);
  const [title, setTitle] = useState(initialTitle);
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcome);
  const [theme, setTheme] = useState(initialTheme);

  // Fetch remote config
  useEffect(() => {
    if (isPreview) return; // Don't fetch remote config if we are in preview mode
    const baseUrl = import.meta.env.VITE_API_URL;
    fetch(`${baseUrl}/widget/${workspaceId}/config`)
      .then(res => res.json())
      .then(data => {
        // Only update if props are NOT provided (or if we want remote config to override)
        // Actually, props should have priority for preview
        if (data.primary_color && !initialColor) setPrimaryColor(data.primary_color);
        if (data.settings?.title && !initialTitle) setTitle(data.settings.title);
        if (data.settings?.welcome_message && !initialWelcome) setWelcomeMessage(data.settings.welcome_message);
        if (data.theme && !initialTheme) setTheme(data.theme);
        
        // If they ARE provided via props, we still might want to initialize state if it was empty
        if (!primaryColor) setPrimaryColor(data.primary_color || initialColor);
        if (!title) setTitle(data.settings?.title || initialTitle);
        if (!welcomeMessage) setWelcomeMessage(data.settings?.welcome_message || initialWelcome);
        if (!theme) setTheme(data.theme || initialTheme);
      })
      .catch(err => console.error('Failed to fetch widget config:', err));
  }, [workspaceId]);

  // Reactive Props synchronization (Critical for Live Preview)
  useEffect(() => { if (initialColor) setPrimaryColor(initialColor); }, [initialColor]);
  useEffect(() => { if (initialTitle) setTitle(initialTitle); }, [initialTitle]);
  useEffect(() => { if (initialWelcome) setWelcomeMessage(initialWelcome); }, [initialWelcome]);
  useEffect(() => { if (initialTheme) setTheme(initialTheme); }, [initialTheme]);

  // Sync welcome message in the messages list (for preview)
  useEffect(() => {
    setMessages(prev => prev.map(m => 
      m.id === 'welcome' ? { ...m, body: welcomeMessage } : m
    ));
  }, [welcomeMessage]);
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Session and WebSocket
  useEffect(() => {
    let sid = isPreview ? 'preview-session' : localStorage.getItem(`xentraldesk_sid_${workspaceId}`);
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15);
      localStorage.setItem(`xentraldesk_sid_${workspaceId}`, sid);
    }
    setSessionId(sid);

    // Initial message
    const stored = isPreview ? null : localStorage.getItem(`xentraldesk_msgs_${workspaceId}`);
    if (stored) {
      setMessages(JSON.parse(stored));
    } else {
      setMessages([{
        id: 'welcome',
        sender_type: 'ai',
        body: welcomeMessage,
        created_at: new Date().toISOString()
      }]);
    }

    // WebSocket connection
    const wsBaseUrl = import.meta.env.VITE_WS_URL;
    const wsUrl = `${wsBaseUrl}/${workspaceId}?session_id=${sid}`;

    const connect = () => {
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          handleIncomingMessage(data);
        } else if (data.type === 'ack') {
          handleAck(data);
        } else if (data.type === 'typing') {
          setIsTyping(data.is_typing);
        }
      };

      ws.current.onclose = () => {
        setTimeout(connect, 3000); // Reconnect
      };
    };

    connect();

    return () => {
      ws.current?.close();
    };
  }, [workspaceId]);

  // Persist messages
  useEffect(() => {
    if (messages.length > 0 && !isPreview) {
      localStorage.setItem(`xentraldesk_msgs_${workspaceId}`, JSON.stringify(messages));
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, workspaceId]);

  const handleIncomingMessage = (data: any) => {
    // De-duplicate based on server-provided ID
    if (data.id && messages.some(m => m.id === data.id)) {
      return;
    }

    const newMessage: Message = {
      id: data.id || Math.random().toString(36).substring(7),
      sender_type: data.sender_type || 'agent',
      body: data.body,
      created_at: data.created_at || new Date().toISOString()
    };
    
    setMessages(prev => {
      // Re-check ID in the functional update to be safe against race conditions
      if (data.id && prev.some(m => m.id === data.id)) {
        return prev;
      }
      return [...prev, newMessage];
    });

    if (!isOpen) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const handleAck = (data: any) => {
    setMessages(prev => prev.map(m => 
      m.temp_id === data.temp_id ? { ...m, status: 'sent' } : m
    ));
  };

  const sendMessage = () => {
    if (!inputText.trim() || !ws.current) return;

    const tempId = Math.random().toString(36).substring(7);
    const newMessage: Message = {
      id: tempId,
      temp_id: tempId,
      sender_type: 'customer',
      body: inputText,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    ws.current.send(JSON.stringify({
      type: 'message',
      text: inputText,
      temp_id: tempId,
      contact_name: 'Visitor'
    }));

    setInputText('');
  };

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[99999] font-sans antialiased",
      theme === 'dark' ? "text-slate-100" : "text-slate-800"
    )}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "mb-4 w-[380px] h-[600px] rounded-[2rem] shadow-2xl border overflow-hidden flex flex-col",
              theme === 'dark' ? "bg-[#1a1c1e] border-slate-800" : "bg-white border-slate-200"
            )}
          >
            {/* Header */}
            <div 
              className="p-6 flex items-center justify-between relative overflow-hidden shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  {avatar ? (
                    <img src={avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white/20" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-primary rounded-full shadow-sm" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                    <p className="text-[10px] font-medium text-white/80 uppercase tracking-wider">Agents Online</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-white transition-colors relative z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Decorative Glass Circles */}
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-[-20%] left-[-10%] w-20 h-20 bg-white/5 rounded-full blur-xl" />
            </div>

            {/* Content Area */}
            <div 
              ref={scrollRef}
              className={cn(
              "flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar scroll-smooth",
              theme === 'dark' ? "bg-[#1a1c1e]" : "bg-slate-50/50"
            )}
            >
              {messages.map((msg, idx) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.sender_type === 'customer' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  {/* Sender Icon */}
                  {msg.sender_type !== 'customer' && (
                    <div className="shrink-0 mt-auto mb-1">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center",
                        theme === 'dark' ? "bg-slate-800" : "bg-slate-200"
                      )}>
                        {msg.sender_type === 'ai' ? (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
                      <div className="w-3 h-3 rounded-[2px] bg-primary/30" />
                    </div>
                        ) : <User className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>
                  )}

                  <div className={cn(
                    "flex flex-col gap-1",
                    msg.sender_type === 'customer' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all",
                      msg.sender_type === 'customer' 
                        ? "bg-primary text-white rounded-br-none shadow-primary/20" 
                        : cn(
                            "border rounded-bl-none shadow-sm",
                            theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                          )
                    )}
                    style={msg.sender_type === 'customer' ? { backgroundColor: primaryColor } : {}}
                    >
                      {msg.body}
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-1 opacity-40 hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-medium uppercase tracking-wider">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.sender_type === 'customer' && (
                        msg.status === 'sent' ? <Check className="w-2.5 h-2.5" /> : <MoreHorizontal className="w-2.5 h-2.5 animate-pulse" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 mb-4"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
                    <div className="w-3 h-3 rounded-[2px] bg-primary/30" />
                  </div>
                  <div className={cn(
                    "px-3 py-2 rounded-2xl rounded-bl-none border flex gap-1",
                    theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                  )}>
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className={cn(
              "p-4 border-t shadow-[0_-10px_20px_rgba(0,0,0,0.02)] shrink-0",
              theme === 'dark' ? "bg-[#1a1c1e] border-slate-800/60" : "bg-white border-slate-100"
            )}>
              <div className={cn(
                "flex items-end gap-2 border rounded-2xl p-2 transition-all focus-within:ring-2 focus-within:ring-primary/20",
                theme === 'dark' ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"
              )}>
                <button className={cn(
                  "p-2 rounded-xl transition-colors",
                  theme === 'dark' ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-200 text-slate-400"
                )}>
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask a question..."
                  className={cn(
                    "flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-1 max-h-32 resize-none no-scrollbar",
                    theme === 'dark' ? "placeholder-slate-600 text-slate-200" : "placeholder-slate-400 text-slate-800"
                  )}
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  className={cn(
                    "p-2.5 rounded-xl transition-all shadow-lg",
                    inputText.trim() 
                      ? "text-white shadow-primary/30" 
                      : cn(
                          "cursor-not-allowed shadow-none",
                          theme === 'dark' ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-400"
                        )
                  )}
                  style={inputText.trim() ? { backgroundColor: primaryColor } : {}}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-3 py-1 opacity-20 grayscale hover:opacity-60 transition-all cursor-default group">
                <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Powered by</span>
                <span className="text-[9px] font-black tracking-tight text-primary uppercase group-hover:scale-110 transition-transform">XentralDesk</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Bubble */}
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setUnreadCount(0);
        }}
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl relative transition-all duration-300"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-8 h-8 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle className="w-8 h-8 text-white fill-current" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {!isOpen && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
            <span className="text-[10px] font-bold text-white">{unreadCount}</span>
          </div>
        )}
      </motion.button>
    </div>
  );
};
