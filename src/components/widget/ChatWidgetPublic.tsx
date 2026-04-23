import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Paperclip, Bot, User, Check, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { WidgetHomeScreen } from './WidgetHomeScreen';
import { RatingPrompt } from './RatingPrompt';
import { PreChatForm } from './PreChatForm';

interface Message {
  id: string;
  sender_type: 'customer' | 'agent' | 'ai' | 'system';
  body: string;
  created_at: string;
  client_id?: string;
  status?: 'sending' | 'sent' | 'error';
  media_url?: string;
  message_type?: string;
}

interface ConversationHistoryItem {
  conversation_id: string;
  last_message: string | null;
  last_message_at: string | null;
  status: string;
  has_active_ticket: boolean;
  updated_at: string;
}

interface RatingData {
  ticket_id: string;
  agent_id: string;
  agent_name: string;
  rated_entity_type: 'agent' | 'ai';
}

type WidgetScreen = 'home' | 'chat';

interface ChatWidgetProps {
  workspaceId: string;
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
  const [screen, setScreen] = useState<WidgetScreen>('home');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [visitorId, setVisitorId] = useState<string>('');
  const [visitorName, setVisitorName] = useState<string>('');
  const [visitorEmail, setVisitorEmail] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>(crypto.randomUUID());
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Handle Resize
  useEffect(() => {
    if (onResize) {
      if (isOpen) {
        onResize('380px', '680px'); // Match widget width exactly
      } else {
        onResize('64px', '64px'); // Match launcher size exactly
      }
    }
  }, [isOpen, onResize]);
  const [wsToken, setWsToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  
  const [primaryColor, setPrimaryColor] = useState(initialColor || '#3b82f6');
  const [title, setTitle] = useState(initialTitle || 'Support');
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcome || 'Hello! How can we help you today?');
  const [theme, setTheme] = useState(initialTheme);

  // Home screen state
  const [conversationHistory, setConversationHistory] = useState<ConversationHistoryItem[]>([]);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(24);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [requireIdentityPreChat, setRequireIdentityPreChat] = useState(false);
  const [isInitializingConv, setIsInitializingConv] = useState(false);

  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (data.require_identity_pre_chat) setRequireIdentityPreChat(data.require_identity_pre_chat);
      })
      .catch(err => console.error('Widget Config Error:', err));
  }, [workspaceKey, isPreview]);

  // 3. Initialize Identity & Session
  useEffect(() => {
    if (isPreview) return;

    const initSession = async () => {
      // Robust Fingerprinting Helper
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      const setCookie = (name: string, value: string, days = 365) => {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `; expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value}${expires}; path=/; SameSite=Lax`;
      };

      // Resolve consent
      const consentKey = `xd_consent_${workspaceKey}`;
      const consent = localStorage.getItem(consentKey) === 'true';
      setHasConsent(consent);
      if (!consent) setShowConsent(true);

      // Resolve visitor ID (sync between localStorage and Cookie)
      const storageKey = `xd_vid_${workspaceKey}`;
      let vid = localStorage.getItem(storageKey) || getCookie(storageKey);
      
      if (!vid) {
        vid = crypto.randomUUID();
      }
      
      
      // Sync back to both storages
      localStorage.setItem(storageKey, vid);
      setCookie(storageKey, vid);
      setVisitorId(vid);

      // Restore Identity
      const identityKey = `xd_identity_${workspaceKey}`;
      const savedIdentity = localStorage.getItem(identityKey);
      if (savedIdentity) {
        try {
          const parsed = JSON.parse(savedIdentity);
          if (parsed.name) setVisitorName(parsed.name);
          if (parsed.email) setVisitorEmail(parsed.email);
        } catch (e) {}
      }

      // Fetch conversation history
      try {
        const historyRes = await fetch(
          `${API_BASE}/widget/conversations/history?workspace_key=${workspaceKey}&visitor_id=${vid}`
        );
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setConversationHistory(historyData.conversations || []);
          setSessionTimeoutHours(historyData.session_timeout_hours || 24);

          const recentConv = historyData.conversations?.[0];
          if (recentConv && recentConv.status === 'open') {
            const lastUpdated = new Date(recentConv.updated_at).getTime();
            const timeoutMs = (historyData.session_timeout_hours || 24) * 60 * 60 * 1000;
            const isWithinTimeout = (Date.now() - lastUpdated) < timeoutMs;

            if (isWithinTimeout) {
              await resumeConversation(vid, recentConv.conversation_id, consent);
              setHasInitialized(true);
              return;
            }
          }
        }
      } catch (err) {
        console.error('History fetch error:', err);
      }

      setScreen('home');
      setHasInitialized(true);
    };

    initSession();
    
    return () => {
      if (ws.current) ws.current.close();
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [workspaceKey]);

  // Metadata collection helper
  const collectMetadata = () => {
    const search = new URLSearchParams(window.location.search);
    return {
      page: window.location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      utm_source: search.get('utm_source'),
      utm_medium: search.get('utm_medium'),
      utm_campaign: search.get('utm_campaign')
    };
  };

  // Resume an existing conversation
  const resumeConversation = async (vid: string, convId?: string, consentOverride?: boolean) => {
    const userToken = (window as any).XentralDesk?.userToken;
    const currentConsent = consentOverride !== undefined ? consentOverride : hasConsent;
    
    try {
      const res = await fetch(`${API_BASE}/widget/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_key: workspaceKey,
          visitor_id: vid,
          session_id: sessionId,
          user_token: userToken,
          metadata: collectMetadata(),
          consent_given: currentConsent
        })
      });
      
      if (!res.ok) throw new Error('Session init failed');
      const data = await res.json();
      
      setConversationId(data.conversation_id);
      setWsToken(data.ws_token);
      setTokenExpiry(new Date(data.expires_at).getTime());
      if (data.ticket_id) setTicketId(data.ticket_id);
      if (data.ticket_status) setTicketStatus(data.ticket_status);
      
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages.map((m: any) => ({ ...m, status: 'sent' })));
      } else {
        // Show welcome message for fresh conversations
        setMessages([{
          id: 'welcome',
          sender_type: 'ai',
          body: welcomeMessage,
          created_at: new Date().toISOString()
        }]);
      }
      
      setScreen('chat');
      connectWS(data.conversation_id, data.ws_token);
    } catch (err) {
      console.error('Resume Error:', err);
    }
  };

  // Start a brand new conversation
  const startNewChat = async () => {
    if (requireIdentityPreChat && !isPreview && (!visitorName || !visitorEmail)) {
      // Don't initialize yet, wait for PreChatForm
      setScreen('chat');
      setMessages([]);
      setConversationId(null);
      return;
    }

    if (!visitorId) return;

    // First, check if we ALREADY have an open conversation we can just pick up
    // This prevents creating 10 empty conversations if the user clicks the button repeatedly
    const openConv = conversationHistory.find(c => c.status === 'open');
    if (openConv) {
      await resumeConversation(visitorId, openConv.conversation_id);
      return;
    }

    const userToken = (window as any).XentralDesk?.userToken;
    
    try {
      const res = await fetch(`${API_BASE}/widget/conversations/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_key: workspaceKey,
          visitor_id: visitorId,
          session_id: sessionId,
          user_token: userToken,
          metadata: collectMetadata(),
          consent_given: hasConsent
        })
      });
      
      if (!res.ok) throw new Error('New chat creation failed');
      const data = await res.json();
      
      // Close existing WS
      if (ws.current) ws.current.close();
      
      setConversationId(data.conversation_id);
      setWsToken(data.ws_token);
      setTokenExpiry(new Date(data.expires_at).getTime());
      setTicketId(null);
      setShowRating(false);
      setRatingData(null);
      setMessages([{
        id: 'welcome',
        sender_type: 'ai',
        body: welcomeMessage,
        created_at: new Date().toISOString()
      }]);
      
      setScreen('chat');
      connectWS(data.conversation_id, data.ws_token);
    } catch (err) {
      console.error('New Chat Error:', err);
    }
  };

  // Resume a past conversation from history
  const handleResumeFromHistory = async (convId: string) => {
    if (!visitorId) return;
    // The existing /conversations endpoint will find/resume it
    await resumeConversation(visitorId, convId);
  };

  // Navigate back to home screen
  const goHome = async () => {
    setScreen('home');
    setShowRating(false);
    // Refresh history
    if (visitorId) {
      try {
        const res = await fetch(
          `${API_BASE}/widget/conversations/history?workspace_key=${workspaceKey}&visitor_id=${visitorId}`
        );
        if (res.ok) {
          const data = await res.json();
          setConversationHistory(data.conversations || []);
        }
      } catch {}
    }
  };

  // 4. Silent Token Refresh
  useEffect(() => {
    if (!conversationId || !wsToken || !tokenExpiry) return;

    const checkRefresh = async () => {
      const now = Date.now();
      const BUFFER_MS = 5 * 60 * 1000;
      
      if (tokenExpiry - now < BUFFER_MS) {
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
            if (data.ticket_status) setTicketStatus(data.ticket_status);
          }
        } catch (err) {
          console.error('Refresh Failed:', err);
        }
      }
    };

    refreshInterval.current = setInterval(checkRefresh, 60000);
    return () => clearInterval(refreshInterval.current!);
  }, [conversationId, wsToken, tokenExpiry]);

  // 5. WebSocket Logic
  const connectWS = (convId: string, token: string) => {
    const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/, '');
    const wsProtocol = apiOrigin.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiOrigin.replace(/^https?/, wsProtocol);
    const wsUrl = `${wsHost}/api/v1/ws/widget/${convId}?token=${token}`;
    
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'message.new') handleIncomingMessage(data.message);
      if (data.type === 'message.ack') handleAck(data);
      if (data.type === 'typing') setIsTyping(data.is_typing);
      if (data.type === 'ticket.updated') {
        setTicketId(data.ticket_id);
        setTicketStatus(data.status);
      }
      if (data.type === 'rating.prompt') {
        setRatingData({
          ticket_id: data.ticket_id,
          agent_id: data.agent_id,
          agent_name: data.agent_name || 'Agent',
          rated_entity_type: data.rated_entity_type || 'agent'
        });
        setShowRating(true);
      }
    };
    socket.onclose = () => {
      setIsConnected(false);
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
      const exists = prev.some(m => 
        (msg.id && m.id === msg.id) || 
        (msg.client_id && m.client_id === msg.client_id)
      );

      if (exists) {
        return prev.map(m => 
          (msg.client_id && m.client_id === msg.client_id) || (msg.id && m.id === msg.id)
            ? { 
                ...m, 
                ...msg,
                status: 'sent',
                // Keep the original client_id if we have one
                client_id: m.client_id || msg.client_id
              } 
            : m
        );
      }

      return [...prev, {
        id: msg.id,
        sender_type: msg.sender_type,
        body: msg.body,
        created_at: msg.created_at,
        status: 'sent',
        client_id: msg.client_id,
        media_url: msg.media_url,
        message_type: msg.message_type
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
    if (data.ticket_id) setTicketId(data.ticket_id);
    if (data.ticket_status) setTicketStatus(data.ticket_status);
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
    if (typingTimer.current) clearTimeout(typingTimer.current);
    sendTypingStatus(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    // Check if it's an image
    const isImage = file.type.startsWith('image/');
    const msgType = isImage ? 'image' : 'file';

    const clientId = Math.random().toString(36).substring(7);
    
    // Create a local preview URL for images
    let previewUrl: string | undefined;
    if (isImage) {
      previewUrl = URL.createObjectURL(file);
    }

    const optimisticMsg: Message = {
      id: clientId,
      client_id: clientId,
      sender_type: 'customer',
      body: `Sending ${file.name}...`,
      created_at: new Date().toISOString(),
      status: 'sending',
      message_type: msgType,
      media_url: previewUrl
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // We need a public upload endpoint for the widget
      // For now, let's assume we'll create /api/v1/widget/uploads
      const res = await fetch(`${API_BASE}/widget/uploads?workspace_key=${workspaceKey}`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      ws.current.send(JSON.stringify({
        type: 'message.send',
        content: `Uploaded ${file.name}`,
        media_url: data.url,
        message_type: msgType,
        client_id: clientId
      }));
    } catch (err) {
      console.error('File Upload Error:', err);
      setMessages(prev => prev.map(m => 
        m.client_id === clientId ? { ...m, status: 'error', body: 'Failed to send file.' } : m
      ));
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!isTyping) sendTypingStatus(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTypingStatus(false), 2000);
  };

  // Rating submission
  const handleRatingSubmit = async (score: number, comment: string) => {
    if (!conversationId || !ratingData) return;
    try {
      await fetch(`${API_BASE}/widget/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          ticket_id: ratingData.ticket_id || null,
          agent_id: ratingData.agent_id || null,
          rated_entity_type: ratingData.rated_entity_type,
          score,
          comment: comment || null
        })
      });
    } catch (err) {
      console.error('Rating submit error:', err);
    }
    setShowRating(false);
    setRatingData(null);
  };

  const handleRatingSkip = () => {
    setShowRating(false);
    setRatingData(null);
  };

  return (
    <div className={cn(
      "absolute bottom-0 right-0 w-full h-full z-[99999] font-sans antialiased flex flex-col items-end justify-end",
      theme === 'dark' ? "text-slate-100" : "text-slate-800"
    )}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "mb-4 w-full flex-1 rounded-[2rem] flex flex-col relative overflow-hidden",
              theme === 'dark' ? "bg-[#1a1c1e]" : "bg-white"
            )}
          >
            {/* Screen Router */}
            {screen === 'home' ? (
              <WidgetHomeScreen
                title={title}
                primaryColor={primaryColor}
                theme={theme}
                conversations={conversationHistory}
                onStartNewChat={startNewChat}
                onResumeConversation={handleResumeFromHistory}
                onClose={() => setIsOpen(false)}
                isConnected={hasInitialized} // Use initialization status for home screen to avoid 'Connecting...' flicker
                avatar={avatar}
                baseUrl={baseUrl}
              />
            ) : (screen === 'chat' && requireIdentityPreChat && !conversationId && !isPreview) ? (
              <div className="flex-1 flex flex-col bg-inherit overflow-hidden">
                <div 
                  className="p-4 flex items-center justify-between relative overflow-hidden shrink-0 border-b border-white/5"
                  style={{ background: '#131316' }}
                >
                  <div className="flex items-center gap-3 relative z-10 px-1">
                    <button onClick={goHome} className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col">
                      <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
                      <p className="text-[10px] text-white/50 font-medium tracking-wide">The team can also help</p>
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <PreChatForm 
                  primaryColor={primaryColor}
                  theme={theme as 'light' | 'dark'}
                  isLoading={isInitializingConv}
                  initialName={visitorName}
                  initialEmail={visitorEmail}
                  onSubmit={async (data) => {
                    try {
                      setIsInitializingConv(true);

                      // Only save to local state AFTER successful api call
                      // so we don't prematurely hide the form.

                      const res = await fetch(`${API_BASE}/widget/conversations/new`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          workspace_key: workspaceKey,
                          visitor_id: visitorId,
                          session_id: sessionId,
                          consent_given: hasConsent,
                          contact_name: data.name,
                          contact_email: data.email,
                          initial_message: data.message
                        })
                      });
                      
                      if (res.ok) {
                        const initData = await res.json();
                        setConversationId(initData.conversation_id);
                        setWsToken(initData.ws_token);
                        setTokenExpiry(new Date(initData.expires_at).getTime());
                        
                        // Use messages from backend, or fallback to the one we just sent
                        const backendMsgs = initData.messages || [];
                        if (backendMsgs.length > 0) {
                          setMessages(backendMsgs.map((m: any) => ({ ...m, status: 'sent' })));
                        } else if (data.message.trim()) {
                          // Fallback optimistic message
                          setMessages([{
                            id: Math.random().toString(36).substring(7),
                            sender_type: 'customer',
                            body: data.message,
                            created_at: new Date().toISOString(),
                            status: 'sent'
                          }]);
                        }
                        
                        connectWS(initData.conversation_id, initData.ws_token);
                        
                        // Save identity locally so form hides and persists
                        setVisitorName(data.name);
                        setVisitorEmail(data.email);
                        localStorage.setItem(`xd_identity_${workspaceKey}`, JSON.stringify({ name: data.name, email: data.email }));
                      } else {
                        throw new Error('Backend failed to create conversation');
                      }
                    } catch (err) {
                      console.error('Pre-chat init failed:', err);
                    } finally {
                      setIsInitializingConv(false);
                    }
                  }}
                />
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div 
                  className="p-4 flex items-center justify-between relative overflow-hidden shrink-0 border-b border-white/5"
                  style={{ background: '#131316' }}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <button 
                      onClick={goHome}
                      className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
                        {isConnected && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                      </div>
                      <p className="text-[10px] text-white/50 font-medium tracking-wide">
                        {ticketId && ticketStatus !== 'resolved' && ticketStatus !== 'closed' ? `Case #${ticketId.slice(0, 8)}` : "The team can also help"}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden px-0 py-4 flex flex-col gap-4 no-scrollbar scroll-smooth",
                    theme === 'dark' ? "bg-[#131316]" : "bg-slate-50/50"
                  )}
                >
                  <AnimatePresence mode="popLayout">
                    {messages.map((msg) => (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "w-full flex px-2 transition-all",
                          msg.sender_type === 'customer' ? "justify-end" : 
                          msg.sender_type === 'system' ? "justify-center" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "flex gap-2 max-w-[90%] group",
                          msg.sender_type === 'customer' ? "flex-row-reverse" : "flex-row"
                        )}>
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
                              {msg.sender_type !== 'customer' && (
                                <div className="shrink-0 mt-auto mb-1">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shadow-sm overflow-hidden",
                                    theme === 'dark' ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
                                  )}>
                                    {msg.sender_type === 'ai' ? (
                                      <img src={`${baseUrl}/bot-avatar.png`} className="w-full h-full object-cover" alt="AI" />
                                    ) : <User className="w-4 h-4 text-slate-500" />}
                                  </div>
                                </div>
                              )}
                              <div className={cn("flex flex-col gap-1.5", msg.sender_type === 'customer' ? "items-end" : "items-start")}>
                                <div className={cn(
                                  "px-4 py-3 rounded-[1.25rem] text-sm leading-relaxed shadow-lg border relative transition-transform group-hover:scale-[1.01] break-words [overflow-wrap:anywhere] whitespace-pre-wrap",
                                  msg.sender_type === 'customer' 
                                    ? "bg-white text-slate-900 rounded-br-[0.6rem] border-white shadow-xl" 
                                    : cn("rounded-bl-[0.6rem]", theme === 'dark' ? "bg-[#26262b] border-white/5 text-slate-100" : "bg-white border-slate-200 text-slate-700")
                                )}
                                >
                                  {msg.media_url && (msg.message_type === 'image' || msg.message_type === 'photo') ? (
                                    <div className="mb-2 max-w-full rounded-lg overflow-hidden border border-white/10">
                                      <img 
                                        src={msg.media_url} 
                                        alt="Uploaded content" 
                                        className="w-full h-[220px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(msg.media_url, '_blank')}
                                      />
                                    </div>
                                  ) : msg.media_url ? (
                                    <div className="mb-2 p-3 bg-white/5 rounded-lg border border-white/10 flex items-center gap-3">
                                      <Paperclip className="w-5 h-5 opacity-50" />
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-medium truncate">{msg.body || 'Attached File'}</span>
                                        <a href={msg.media_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline">Download</a>
                                      </div>
                                    </div>
                                  ) : null}
                                  {msg.sender_type === 'ai' || msg.sender_type === 'agent' ? (
                                    <div className="markdown-content max-w-full overflow-hidden">
                                      <ReactMarkdown 
                                        components={{
                                          a: ({ ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className={cn("underline break-all block", theme === 'dark' ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700")} />,
                                          ul: ({ ...props}) => <ul {...props} className="list-disc ml-4 my-2 space-y-1 max-w-full overflow-hidden" />,
                                          ol: ({ ...props}) => <ol {...props} className="list-decimal ml-4 my-2 space-y-1 max-w-full overflow-hidden" />,
                                          li: ({ ...props}) => <li {...props} className="break-all whitespace-normal" />,
                                          p: ({ ...props}) => <p {...props} className="mb-2 last:mb-0 break-words" />,
                                          strong: ({ ...props}) => <strong {...props} className={cn("font-bold", theme === 'dark' ? "text-white" : "text-slate-900")} />,
                                          code: ({ ...props}) => <code {...props} className={cn("px-1.5 py-0.5 rounded text-xs font-mono break-all inline-block max-w-full", theme === 'dark' ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-800")} />
                                        }}
                                      >
                                        {msg.body}
                                      </ReactMarkdown>
                                    </div>
                                  ) : (
                                    // For customers, don't show the body if it's an image (to avoid showing "Sending..." or filenames)
                                    (msg.message_type !== 'image' && msg.message_type !== 'photo') && msg.body
                                  )}
                                </div>
                                <div className={cn("flex items-center gap-3 px-1 mt-1.5", msg.sender_type === 'customer' ? "justify-end flex-row-reverse" : "justify-start")}>
                                  {msg.sender_type === 'customer' && (
                                    <div className={cn("flex items-center gap-1.5 transition-opacity", msg.status === 'sent' ? "opacity-30 group-hover:opacity-100" : "opacity-100")}>
                                      <span className="text-[10px] font-bold uppercase tracking-tighter">{msg.status === 'sent' ? 'Delivered' : 'Sending'}</span>
                                      {msg.status === 'sent' ? <Check className="w-2.5 h-2.5 text-primary" /> : <div className="w-1 h-1 rounded-full bg-primary animate-ping" />}
                                    </div>
                                  )}
                                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-20 group-hover:opacity-100 transition-opacity duration-300">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isTyping && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-6 px-2">
                      <div className="w-8 h-8 rounded-full border border-primary/10 shadow-sm shrink-0 overflow-hidden">
                        <img src={`${baseUrl}/bot-avatar.png`} className="w-full h-full object-cover" alt="Typing" />
                      </div>
                      <div className={cn("px-4 py-2.5 rounded-2xl rounded-bl-none border flex items-center gap-1.5", theme === 'dark' ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200")}>
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input Area */}
                <div className={cn("p-4 shrink-0", theme === 'dark' ? "bg-[#131316]" : "bg-white")}>
                  <div className={cn(
                    "flex flex-col border rounded-[1.5rem] transition-all focus-within:ring-1 focus-within:ring-white/10",
                    theme === 'dark' ? "bg-[#1f1f23] border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <textarea
                      value={inputText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Message..."
                      className={cn(
                        "w-full bg-transparent border-none focus:ring-0 text-[13px] py-4 px-5 min-h-[56px] max-h-32 resize-none no-scrollbar leading-normal",
                        theme === 'dark' ? "placeholder-white/20 text-white" : "placeholder-slate-400 text-slate-800"
                      )}
                      rows={1}
                    />
                    <div className="flex items-center justify-between px-3 pb-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className={cn("p-2 rounded-lg transition-colors", theme === 'dark' ? "hover:bg-white/5 text-white/40 hover:text-white/60" : "hover:bg-slate-200 text-slate-400")}
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                        <button className={cn("p-2 rounded-lg transition-colors", theme === 'dark' ? "hover:bg-white/5 text-white/40 hover:text-white/60" : "hover:bg-slate-200 text-slate-400")}>
                          <Bot className="w-5 h-5" />
                        </button>
                        <div className="w-[1px] h-4 bg-white/5 mx-1" />
                        <button className={cn("p-2 rounded-lg transition-colors", theme === 'dark' ? "hover:bg-white/5 text-white/40 hover:text-white/60" : "hover:bg-slate-200 text-slate-400")}>
                          <MessageCircle className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <button
                        onClick={sendMessage}
                        disabled={!inputText.trim()}
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                          inputText.trim() 
                            ? "bg-white text-black shadow-lg shadow-white/10 hover:scale-105" 
                            : cn("bg-white/5 text-white/20", theme === 'dark' ? "" : "bg-slate-200")
                        )}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 19V5M5 12l7-7 7 7"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-4 opacity-30 grayscale hover:opacity-60 transition-all cursor-default group">
                    <MessageCircle className="w-3 h-3 text-white" />
                    <span className="text-[9px] font-bold tracking-tight text-white/80 uppercase tracking-widest">Powered by XentralDesk</span>
                  </div>
                </div>

                {/* Rating Overlay */}
                <AnimatePresence>
                  {showRating && ratingData && (
                    <RatingPrompt
                      agentName={ratingData.agent_name}
                      ratedEntityType={ratingData.rated_entity_type}
                      primaryColor={primaryColor}
                      theme={theme}
                      onSubmit={handleRatingSubmit}
                      onSkip={handleRatingSkip}
                    />
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consent Banner */}
      <AnimatePresence>
        {showConsent && isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={cn(
              "absolute bottom-24 left-4 right-4 z-[100] p-4 rounded-2xl shadow-2xl border flex flex-col gap-3",
              theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <p className="text-[11px] leading-snug opacity-80">
              We use cookies and tracking to improve your support experience and help our team assist you better.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setHasConsent(true);
                  setShowConsent(false);
                  localStorage.setItem(`xd_consent_${workspaceKey}`, 'true');
                }}
                className="flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Accept
              </button>
              <button
                onClick={() => setShowConsent(false)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors",
                  theme === 'dark' ? "border-slate-800 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50"
                )}
              >
                Decline
              </button>
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
        className="w-16 h-16 rounded-full flex items-center justify-center relative transition-all duration-300"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-8 h-8 text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
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
