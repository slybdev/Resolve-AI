import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Paperclip, Bot, User, Check, MoreHorizontal } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Message {
  id: string;
  sender_type: 'customer' | 'agent' | 'ai' | 'system';
  body: string;
  created_at: string;
  client_id?: string;
  status?: 'sending' | 'sent' | 'error';
}

interface ChatWidgetProps {
  workspaceId: string; // This is the public_key (ws_live_...)
  primaryColor?: string;
  title?: string;
  welcomeMessage?: string;
  avatar?: string;
  theme?: 'light' | 'dark';
  isPreview?: boolean;
  baseUrl?: string;
  onResize?: (width: string, height: string) => void;
}

export const ChatWidgetPublic = ({ 
  workspaceId: workspaceKey, 
  primaryColor: initialColor, 
  title: initialTitle, 
  welcomeMessage: initialWelcome,
  avatar,
  theme: initialTheme = 'dark',
  isPreview = false,
  baseUrl: propBaseUrl,
  onResize
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(isPreview);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [visitorId, setVisitorId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [wsToken, setWsToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  
  const [primaryColor, setPrimaryColor] = useState(initialColor || '#3b82f6');
  const [title, setTitle] = useState(initialTitle || 'Support');
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcome || 'Hello! How can we help you today?');
  const [theme, setTheme] = useState(initialTheme);

  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const baseUrl = propBaseUrl || (window.location.origin);
  const API_BASE = import.meta.env.VITE_API_URL || `${baseUrl}/api/v1`;

  // 1. Resize Iframe when open state changes
  useEffect(() => {
    if (onResize) {
      if (isOpen) {
        onResize('400px', '700px');
      } else {
        onResize('100px', '100px');
      }
    }
  }, [isOpen, onResize]);

  // 2. Fetch Remote Config
  useEffect(() => {
    if (isPreview) return;
    fetch(`${API_BASE}/widget/config?workspace_key=${workspaceKey}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.display_name) setTitle(data.display_name);
        if (data.greeting) setWelcomeMessage(data.greeting);
        if (data.theme) setTheme(data.theme);
      })
      .catch(err => console.error('Widget Config Error:', err));
  }, [workspaceKey, isPreview]);

  // 3. Initialize Identity & Session
  useEffect(() => {
    if (isPreview) return;

    const initSession = async () => {
      // Resolve visitor ID
      let vid = localStorage.getItem(`xd_vid_${workspaceKey}`);
      if (!vid) {
        vid = crypto.randomUUID();
        localStorage.setItem(`xd_vid_${workspaceKey}`, vid);
      }
      setVisitorId(vid);

      // Identity Token (Customer Signed)
      const userToken = (window as any).XentralDesk?.userToken;

      try {
        const res = await fetch(`${API_BASE}/widget/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             workspace_key: workspaceKey,
             visitor_id: vid,
             user_token: userToken
          })
        });
        
        if (!res.ok) throw new Error('Identity failed');
        const data = await res.json();
        
        setConversationId(data.conversation_id);
        setWsToken(data.ws_token);
        setTokenExpiry(new Date(data.expires_at).getTime());
        if (data.ticket_id) setTicketId(data.ticket_id);
        
        // 5. Load History
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m: any) => ({ ...m, status: 'sent' })));
        }
        
        // Connect WS
        connectWS(data.conversation_id, data.ws_token);
      } catch (err) {
        console.error('Session Init Error:', err);
      }
    };

    initSession();
    
    return () => {
      if (ws.current) ws.current.close();
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [workspaceKey]);

  // 4. Silent Token Refresh
  useEffect(() => {
    if (!conversationId || !wsToken || !tokenExpiry) return;

    const checkRefresh = async () => {
      const now = Date.now();
      const BUFFER_MS = 5 * 60 * 1000; // 5 mins buffer
      
      if (tokenExpiry - now < BUFFER_MS) {
        console.log('Refreshing WS Token...');
        try {
          const res = await fetch(`${API_BASE}/widget/conversations/${conversationId}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_token: wsToken })
          });
          if (res.ok) {
            const data = await res.json();
            setWsToken(data.ws_token);
            setTokenExpiry(new Date(data.expires_at).getTime());
            if (data.ticket_id) setTicketId(data.ticket_id);
            // No need to reconnect, current WS might still be valid, 
            // the next reconnect will use the new token.
          }
        } catch (err) {
          console.error('Refresh Failed:', err);
        }
      }
    };

    refreshInterval.current = setInterval(checkRefresh, 60000); // Check every minute
    return () => clearInterval(refreshInterval.current!);
  }, [conversationId, wsToken, tokenExpiry]);

  // 5. Initialize Messages with Welcome if empty
  useEffect(() => {
    if (messages.length === 0 && welcomeMessage) {
      setMessages([{
        id: 'welcome',
        sender_type: 'ai',
        body: welcomeMessage,
        created_at: new Date().toISOString()
      }]);
    }
  }, [welcomeMessage]);

  // 6. WebSocket Logic
  const connectWS = (convId: string, token: string) => {
    // Derive WS host from API base (e.g. http://localhost:8000/api/v1 → ws://localhost:8000)
    const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/, '');
    const wsProtocol = apiOrigin.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiOrigin.replace(/^https?/, wsProtocol);
    const wsUrl = `${wsHost}/api/v1/ws/widget/${convId}?token=${token}`;
    
    console.log('[Widget WS] API_BASE =', API_BASE);
    console.log('[Widget WS] Connecting to:', wsUrl);
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'message.new') handleIncomingMessage(data.message);
      if (data.type === 'message.ack') handleAck(data);
      if (data.type === 'typing') setIsTyping(data.is_typing);
    };
    socket.onclose = () => {
      setIsConnected(false);
      // Reconnect logic using latest stored token
      setTimeout(() => {
         if (wsToken) connectWS(convId, wsToken);
      }, 3000);
    };
  };

  // Persist messages
  useEffect(() => {
    if (messages.length > 0 && !isPreview) {
      localStorage.setItem(`xd_msgs_${workspaceKey}`, JSON.stringify(messages));
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, workspaceKey]);

  const handleIncomingMessage = (msg: any) => {
    setMessages(prev => {
      // De-duplicate based on server-provided ID OR client_id
      const exists = prev.some(m => 
        (msg.id && m.id === msg.id) || 
        (msg.client_id && m.client_id === msg.client_id)
      );

      if (exists) {
        // Update existing message if it was in 'sending' state
        return prev.map(m => 
          (msg.client_id && m.client_id === msg.client_id) 
            ? { ...m, id: msg.id, status: 'sent', created_at: msg.created_at } 
            : m
        );
      }

      return [...prev, {
        id: msg.id,
        sender_type: msg.sender_type,
        body: msg.body,
        created_at: msg.created_at,
        status: 'sent',
        client_id: msg.client_id
      }];
    });

    if (!isOpen) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const handleAck = (data: any) => {
    setMessages(prev => prev.map(m => 
      m.client_id === data.client_id ? { ...m, id: data.server_id, status: 'sent' } : m
    ));
    // If ticket_id is returned in ACK (if we add it later), update state
    if (data.ticket_id) setTicketId(data.ticket_id);
  };

  const sendMessage = () => {
    if (!inputText.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    const clientId = Math.random().toString(36).substring(7);
    const newMessage: Message = {
      id: clientId,
      client_id: clientId,
      sender_type: 'customer',
      body: inputText,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    ws.current.send(JSON.stringify({
      type: 'message.send',
      content: inputText,
      client_id: clientId
    }));

    setInputText('');
    
    // Clear typing status immediately
    if (typingTimer.current) clearTimeout(typingTimer.current);
    sendTypingStatus(false);
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    
    if (!isTyping) {
      sendTypingStatus(true);
    }
    
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
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
              className="p-6 flex items-center justify-between relative overflow-hidden shrink-0 border-b border-white/10"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
            >
              {/* Glassmorphism Blur Layer */}
              <div className="absolute inset-0 backdrop-blur-xl bg-white/5" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  {avatar ? (
                    <img src={avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white/20 shadow-inner" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                  )}
                  {/* Connection Pulse */}
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 shadow-sm transition-colors duration-500",
                    theme === 'dark' ? "border-[#1a1c1e]" : "border-white",
                    isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                  )} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight drop-shadow-sm">{title}</h3>
                  <div className="flex items-center gap-2">
                    {ticketId ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest whitespace-nowrap">Case: #{ticketId.slice(0, 8)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all duration-500",
                          isConnected ? "bg-white/60 animate-pulse" : "bg-white/20"
                        )} />
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                          {isConnected ? 'Online' : 'Restoring Connection...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-white transition-all hover:rotate-90 relative z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Decorative Mesh Gradient Circles */}
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-[-20%] left-[-10%] w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            </div>

            {/* Content Area */}
            <div 
              ref={scrollRef}
              className={cn(
              "flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar scroll-smooth",
              theme === 'dark' ? "bg-[#1a1c1e]" : "bg-slate-50/50"
            )}
            >
              <AnimatePresence mode="popLayout">
                {messages.map((msg, idx) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.9, y: 15, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ 
                      type: 'spring',
                      damping: 15,
                      stiffness: 100,
                      delay: isPreview ? idx * 0.05 : 0 // Only staggered for preview/history, not live chat
                    }}
                    className={
                      msg.sender_type === 'system'
                        ? "flex justify-center w-full my-4"
                        : cn(
                            "flex gap-3 max-w-[88%] group transition-all",
                            msg.sender_type === 'customer' ? "ml-auto flex-row-reverse" : "mr-auto"
                          )
                    }
                  >
                    {msg.sender_type === 'system' ? (
                      <div className={cn(
                        "px-4 py-1.5 rounded-full backdrop-blur-sm shadow-sm",
                        theme === 'dark' ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/60 border border-slate-200/50"
                      )}>
                        <span className={cn(
                          "text-[9px] font-black tracking-[0.2em] uppercase",
                          theme === 'dark' ? "text-slate-400" : "text-slate-500"
                        )}>
                          {msg.body}
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Sender Icon */}
                        {msg.sender_type !== 'customer' && (
                          <div className="shrink-0 mt-auto mb-1">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
                              theme === 'dark' ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
                            )}>
                                {msg.sender_type === 'ai' ? (
                                  <img src={`${baseUrl}/bot-avatar.png`} className="w-full h-full object-cover rounded-full" alt="AI" />
                                ) : <User className="w-4 h-4 text-slate-500" />}
                            </div>
                          </div>
                        )}

                        <div className={cn(
                          "flex flex-col gap-1.5",
                          msg.sender_type === 'customer' ? "items-end" : "items-start"
                        )}>
                          <div className={cn(
                            "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg border relative transition-transform group-hover:scale-[1.02]",
                            msg.sender_type === 'customer' 
                              ? "text-white rounded-br-none shadow-primary/20 border-white/10" 
                              : cn(
                                  "rounded-bl-none",
                                  theme === 'dark' ? "bg-slate-800/80 backdrop-blur-md border-slate-700 text-slate-200 shadow-black/20" : "bg-white border-slate-200 text-slate-700 shadow-slate-200/50"
                                )
                          )}
                          style={msg.sender_type === 'customer' ? { 
                            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
                          } : {}}
                          >
                            {msg.body}
                          </div>
                            
                          <div className={cn(
                            "flex items-center gap-3 px-1 mt-1.5",
                            msg.sender_type === 'customer' ? "justify-end flex-row-reverse" : "justify-start"
                          )}>
                            {/* Status for Customer Messages */}
                            {msg.sender_type === 'customer' && (
                              <div className={cn(
                                "flex items-center gap-1.5 transition-opacity",
                                msg.status === 'sent' ? "opacity-30 group-hover:opacity-100" : "opacity-100"
                              )}>
                                <span className="text-[10px] font-bold uppercase tracking-tighter">
                                  {msg.status === 'sent' ? 'Delivered' : 'Sending'}
                                </span>
                                {msg.status === 'sent' ? (
                                  <Check className="w-2.5 h-2.5 text-primary" />
                                ) : (
                                  <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
                                )}
                              </div>
                            )}

                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-20 group-hover:opacity-100 transition-opacity duration-300">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 mb-6"
                >
                  <div className="w-8 h-8 rounded-full border border-primary/10 shadow-sm shrink-0 overflow-hidden">
                    <img src={`${baseUrl}/bot-avatar.png`} className="w-full h-full object-cover" alt="AI Typing" />
                  </div>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl rounded-bl-none border flex items-center gap-1.5 relative overflow-hidden",
                    theme === 'dark' ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"
                  )}>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-primary/30 rounded-full" 
                    />
                    
                    {/* Subtle Scanline Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
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
                  onChange={(e) => handleTextChange(e.target.value)}
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
