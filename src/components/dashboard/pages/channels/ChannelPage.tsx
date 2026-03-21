import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, Mail, MessageSquare, Send, Slack, Mic, 
  CheckCircle2, AlertCircle, Settings, BarChart3, 
  RefreshCw, Save, ExternalLink, ShieldCheck,
  Zap, Clock, MessageCircle, Eye, EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';
import { Modal } from '@/src/components/ui/Modal';

interface ChannelPageProps {
  type: 'website' | 'email' | 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'discord' | 'slack' | 'voice';
  title: string;
  icon: any;
  description: string;
  workspaceId: string;
}

export const ChannelPage = ({ type, title, icon: Icon, description, workspaceId }: ChannelPageProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [channelId, setChannelId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form State
  const [config, setConfig] = useState<any>({});
  const [name, setName] = useState(title);
  const [channelStats, setChannelStats] = useState<any>({
    total_messages: 0,
    avg_response_time: 0,
    resolution_rate: 0,
    ai_automation_rate: 0
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{success: boolean, detail: string} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // WhatsApp QR States
  const [waMode, setWaMode] = useState<'qr' | 'api'>('qr');
  const [qrStatus, setQrStatus] = useState<any>(null);
  const [isPollingQr, setIsPollingQr] = useState(false);
  const pollingInterval = useRef<any>(null);

  useEffect(() => {
    if (type === 'whatsapp' && waMode === 'qr') {
      startQrPolling();
    } else {
      stopQrPolling();
    }
    return () => stopQrPolling();
  }, [type, waMode]);

  const startQrPolling = () => {
    if (isPollingQr) return;
    setIsPollingQr(true);
    fetchQrStatus();
    pollingInterval.current = setInterval(fetchQrStatus, 5000);
  };

  const stopQrPolling = () => {
    setIsPollingQr(false);
    if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
    }
  };

  const fetchQrStatus = async () => {
    try {
        const res = await api.whatsappQr.getQr();
        setQrStatus(res);
        if (res.status === 'authenticated') {
            stopQrPolling();
            setIsConnected(true);
            toast('Success', 'WhatsApp connected successfully!', 'success');
        }
    } catch (err) {
        console.error('Failed to fetch QR:', err);
    }
  };

  const handleLogoutWa = async () => {
    try {
        await api.whatsappQr.logout();
        setQrStatus(null);
        setIsConnected(false); // Reset local state
        startQrPolling();
        toast('Success', 'WhatsApp logged out', 'success');
    } catch (err) {
        console.error('Logout failed:', err);
        toast('Error', 'Logout failed', 'error');
    }
  };

  const handleClearWaSession = async () => {
    if (!confirm('This will completely clear your WhatsApp session and restart the bridge. Proceed?')) return;
    setIsSaving(true);
    try {
        await api.whatsappQr.clearSession();
        setQrStatus(null);
        setIsConnected(false);
        startQrPolling();
        toast('Success', 'WhatsApp session cleared and restarted. Please wait for a new QR code.', 'success');
    } catch (err) {
        console.error('Clear session failed:', err);
        toast('Error', 'Failed to clear session', 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const statsDisplay = [
    { label: 'Total Messages', value: channelStats.total_messages.toLocaleString(), change: '+0%', icon: MessageSquare, color: 'emerald' },
    { label: 'Avg. Response Time', value: `${channelStats.avg_response_time}m`, change: '-0%', icon: Clock, color: 'red' },
    { label: 'Resolution Rate', value: `${channelStats.resolution_rate.toFixed(1)}%`, change: '+0%', icon: CheckCircle2, color: 'emerald' },
    { label: 'AI Automation', value: `${channelStats.ai_automation_rate.toFixed(1)}%`, change: '+0%', icon: Zap, color: 'emerald' },
  ];

  const advancedSettings = [
    { id: 'auto_reply', label: 'Auto-Reply', desc: 'Send automated confirmation when a message is received.' },
    { id: 'sla_tracking', label: 'SLA Tracking', desc: 'Monitor and alert when response times exceed targets.' },
    { id: 'sentiment', label: 'AI Sentiment Analysis', desc: 'Detect customer mood and prioritize frustrated users.' },
    { id: 'handoff', label: 'Human Handoff', desc: 'Automatically escalate to human if AI confidence is low.' },
  ];

  const toggleSetting = (id: string) => {
    setConfig((prev: any) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const channelTypeMap: Record<string, string> = {
    'website': 'widget',
    'email': 'email',
    'whatsapp': 'whatsapp',
    'instagram': 'instagram',
    'facebook': 'facebook',
    'telegram': 'telegram',
    'discord': 'discord',
    'slack': 'slack',
    'voice': 'voice'
  };

  const backType = channelTypeMap[type];

  useEffect(() => {
    fetchChannel();
  }, [workspaceId, type]);

  const fetchChannel = async () => {
    setIsLoading(true);
    try {
      const channels = await api.channels.list(workspaceId);
      const existing = channels.find((c: any) => c.type === backType);
      if (existing) {
        setIsConnected(existing.is_active);
        setChannelId(existing.id);
        setConfig(existing.config || {});
        setName(existing.name);
        // Fetch stats if channel exists
        const statsData = await api.channels.stats(existing.id);
        setChannelStats(statsData);
      } else {
        setIsConnected(false);
        setChannelId(null);
        setConfig({});
      }
    } catch (err) {
      console.error('Failed to fetch channel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!channelId) return;
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await api.channels.verify(channelId);
      setVerificationResult({ success: res.success, detail: res.detail });
      if (res.success) {
        if (res.info?.msg_delivery === "failed") {
          toast('Success (with Warning)', 'Connection verified, but we couldn\'t send a test message. Please DM your bot or add it to a server first!', 'warning');
        } else {
          toast('Success', res.detail, 'success');
        }
      } else {
        if (res.detail.includes("Message Content Intent")) {
          setIsErrorModalOpen(true);
        } else {
          toast('Verification Failed', res.detail, 'error');
        }
      }
    } catch (err: any) {
      setVerificationResult({ success: false, detail: err.message });
      toast('Error', err.message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSync = async () => {
    if (!channelId) return;
    setIsSyncing(true);
    try {
      const res = await api.channels.sync(channelId);
      toast('Success', `Synced ${res.synced_count} message(s).`, 'success');
      fetchChannel(); // Refresh stats
    } catch (err: any) {
      toast('Error', err.message || 'Failed to sync messages', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    let currentId = channelId;
    if (!currentId) {
      // Create channel first
      setIsSaving(true);
      try {
        const res = await api.channels.create(workspaceId, {
          name,
          type: backType,
          config: {}
        });
        currentId = res.id;
        setChannelId(res.id);
        setIsConnected(true);
      } catch (err: any) {
        toast('Error', err.message || 'Failed to initialize channel', 'error');
        setIsSaving(false);
        return;
      }
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const settings = await (await fetch(`${baseUrl}/channels/${currentId}/google/login`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('xentraldesk_token')}`
        }
      })).json();
      
      if (settings.auth_url) {
        window.location.href = settings.auth_url;
      }
    } catch (err: any) {
      toast('Error', 'Failed to start Google OAuth', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    setIsSaving(true);
    try {
      if (isConnected && channelId) {
        // Disconnect logic (we'll just deactivate or delete)
        await api.channels.delete(channelId);
        toast('Success', `${title} disconnected`, 'success');
        setIsConnected(false);
        setChannelId(null);
      } else {
        // Connect logic
        const res = await api.channels.create(workspaceId, {
          name,
          type: backType,
          config,
          is_active: true
        });
        setChannelId(res.id);
        setIsConnected(true);
        toast('Success', `${title} connected successfully`, 'success');
      }
    } catch (err: any) {
      toast('Error', err.message || 'Failed to update channel', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!channelId) {
      handleConnect();
      return;
    }

    setIsSaving(true);
    try {
      await api.channels.update(channelId, {
        name,
        config
      });
      toast('Success', 'Settings saved', 'success');
    } catch (err: any) {
      toast('Error', err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full w-full bg-background overflow-y-auto no-scrollbar p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
              isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              isConnected 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                : "bg-orange-500/10 text-orange-500 border-orange-500/20"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-orange-500")} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <button 
              onClick={handleConnect}
              disabled={isSaving}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all btn-press flex items-center gap-2",
                isConnected 
                  ? "bg-accent/50 text-foreground border border-border hover:bg-accent" 
                  : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
              )}
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isConnected ? 'Disconnect' : 'Connect Channel')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statsDisplay.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border p-4 rounded-2xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  stat.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {stat.change}
                </span>
              </div>
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Channel Configuration</h2>
              </div>

              {type === 'email' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Support Email</label>
                      <input 
                        type="email" 
                        value={config.smtp_user || ''} 
                        onChange={(e) => setConfig({...config, smtp_user: e.target.value})}
                        placeholder="support@company.com" 
                        className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Sender Name</label>
                      <input type="text" placeholder="XentralDesk Support" className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Signature</label>
                    <textarea 
                      rows={3} 
                      value={config.signature || ''}
                      onChange={(e) => setConfig({...config, signature: e.target.value})}
                      placeholder="Best regards, The Team" 
                      className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" 
                    />
                  </div>
                </div>
              )}

              {type === 'email' && (
                <div className="space-y-6">
                  <div className="p-8 border-2 border-dashed border-border/50 rounded-3xl bg-accent/10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold">Connect your Gmail</h3>
                      <p className="text-sm text-muted-foreground max-w-[280px]">
                        Sync your support emails directly into XentralDesk using Google's secure OAuth flow.
                      </p>
                    </div>
                    
                    {!isConnected ? (
                      <button 
                        onClick={handleGoogleLogin}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-2xl text-sm font-bold hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-black/5"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold ring-1 ring-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Authorized as {config.from_email || 'Google User'}
                        </div>
                        <button 
                          onClick={handleGoogleLogin}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                        >
                          Reconnect or switch account
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {type === 'whatsapp' && (
                <div className="space-y-6">
                  {/* Mode Selector */}
                  <div className="flex bg-accent/20 p-1 rounded-xl w-fit">
                    <button 
                      onClick={() => setWaMode('qr')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${waMode === 'qr' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Linked Device (QR)
                    </button>
                    <button 
                      onClick={() => setWaMode('api')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${waMode === 'api' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      WhatsApp Business API
                    </button>
                  </div>

                  {waMode === 'qr' ? (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row gap-8 items-center bg-accent/10 p-6 rounded-2xl border border-border">
                        <div className="flex-shrink-0 bg-white p-4 rounded-xl shadow-inner">
                          {qrStatus?.status === 'qr' ? (
                            <img src={qrStatus.qr} alt="WhatsApp QR Code" className="w-48 h-48" />
                          ) : qrStatus?.status === 'authenticated' ? (
                            <div className="w-48 h-48 flex flex-col items-center justify-center gap-3 text-green-500">
                              <CheckCircle2 className="w-16 h-16" />
                              <span className="text-xs font-bold uppercase tracking-widest text-foreground">Connected</span>
                            </div>
                          ) : (
                            <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                              <RefreshCw className="w-8 h-8 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 max-w-sm">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-foreground">Link your WhatsApp Account</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Open WhatsApp on your phone, tap Settings &gt; Linked Devices, and point your camera at this QR code.
                            </p>
                          </div>
                          <ul className="space-y-2">
                            {[
                              'Messages synced automatically',
                              'Supports groups and personal chats',
                              'No Business API approval required'
                            ].map((text, i) => (
                              <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <div className="w-1 h-1 rounded-full bg-primary" />
                                {text}
                              </li>
                            ))}
                          </ul>
                          {qrStatus?.status === 'authenticated' && (
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={handleLogoutWa}
                                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                              >
                                Disconnect Session
                              </button>
                              <button 
                                onClick={handleClearWaSession}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Reset Bridge
                              </button>
                            </div>
                          )}
                          {qrStatus?.status === 'qr' && (
                            <button 
                              onClick={handleClearWaSession}
                              className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Not working? Reset Bridge
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">WhatsApp Business Number</label>
                          <input 
                            type="text" 
                            value={config.phone_number || ''}
                            onChange={(e) => setConfig({...config, phone_number: e.target.value})}
                            placeholder="+1 (555) 000-0000" 
                            className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Phone Number ID</label>
                          <input 
                            type="text" 
                            value={config.phone_number_id || ''}
                            onChange={(e) => setConfig({...config, phone_number_id: e.target.value})}
                            placeholder="123456789012345" 
                            className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">System Access Token</label>
                        <div className="relative">
                          <input 
                            type={showToken ? 'text' : 'password'}
                            value={config.access_token || ''} 
                            onChange={(e) => setConfig({...config, access_token: e.target.value})}
                            placeholder="EAAB..." 
                            className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Webhook Info for Meta Dashboard */}
                      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary" />
                          <h3 className="text-xs font-bold text-foreground">Webhook Configuration (Meta Dashboard)</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Callback URL</span>
                            <code className="text-[10px] bg-background border border-border p-1.5 rounded-lg select-all">
                              {import.meta.env.VITE_API_URL}/webhooks/whatsapp
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {type === 'instagram' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Instagram Page ID</label>
                      <input 
                        type="text" 
                        value={config.instagram_page_id || ''}
                        onChange={(e) => setConfig({...config, instagram_page_id: e.target.value})}
                        placeholder="123456789012345" 
                        className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Page Access Token</label>
                      <div className="relative">
                        <input 
                          type={showToken ? 'text' : 'password'}
                          value={config.access_token || ''} 
                          onChange={(e) => setConfig({...config, access_token: e.target.value})}
                          placeholder="EAAB..." 
                          className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Webhook Info for Meta Dashboard */}
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground">Webhook Configuration (Meta Dashboard)</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Callback URL</span>
                        <code className="text-[10px] bg-background border border-border p-1.5 rounded-lg select-all">
                          {import.meta.env.VITE_API_URL}/webhooks/instagram
                        </code>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Verify Token</span>
                        <code className="text-[10px] bg-background border border-border p-1.5 rounded-lg select-all">
                          xentraldesk_verify_token
                        </code>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                      Copy these values into your Meta App's Instagram Webhook settings.
                    </p>
                  </div>
                </div>
              )}

              {type === 'facebook' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Facebook Page ID</label>
                      <input 
                        type="text" 
                        value={config.facebook_page_id || ''}
                        onChange={(e) => setConfig({...config, facebook_page_id: e.target.value})}
                        placeholder="123456789012345" 
                        className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Page Access Token</label>
                      <div className="relative">
                        <input 
                          type={showToken ? 'text' : 'password'}
                          value={config.access_token || ''} 
                          onChange={(e) => setConfig({...config, access_token: e.target.value})}
                          placeholder="EAAB..." 
                          className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Webhook Info for Meta Dashboard */}
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground">Webhook Configuration (Meta Dashboard)</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Callback URL</span>
                        <code className="text-[10px] bg-background border border-border p-1.5 rounded-lg select-all">
                          {import.meta.env.VITE_API_URL}/webhooks/facebook
                        </code>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Verify Token</span>
                        <code className="text-[10px] bg-background border border-border p-1.5 rounded-lg select-all">
                          xentraldesk_verify_token
                        </code>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                      Copy these values into your Meta App's Facebook Webhook settings.
                    </p>
                  </div>
                </div>
              )}

              {type === 'website' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Authorized Domains</label>
                    <input type="text" placeholder="*.company.com, company.com" className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ensure your widget is only loaded on approved domains for security.
                    </p>
                  </div>
                </div>
              )}

              {(type === 'telegram' || type === 'discord' || type === 'slack') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                      {type === 'telegram' || type === 'discord' || type === 'slack' ? 'Bot Token' : 'Webhook URL'}
                    </label>
                    <div className="relative">
                      <input 
                        type={type === 'telegram' || type === 'discord' || type === 'slack' ? (showToken ? 'text' : 'password') : 'text'}
                        value={type === 'telegram' || type === 'discord' ? (config.token || '') : type === 'slack' ? (config.bot_token || '') : (config.webhook_url || '')}
                        onChange={(e) => {
                          const key = type === 'telegram' || type === 'discord' ? 'token' : type === 'slack' ? 'bot_token' : 'webhook_url';
                          setConfig({...config, [key]: e.target.value});
                        }}
                        placeholder={type === 'telegram' ? "123456789:ABCdefGHI..." : type === 'discord' ? "MTE2..." : type === 'slack' ? "xoxb-your-bot-token" : "https://hooks.slack.com/services/..."} 
                        className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                      {(type === 'telegram' || type === 'discord' || type === 'slack') && (
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    How to get your {type} credentials
                  </button>

                  {/* Webhook Info for Slack/Discord/Telegram */}
                  {(type === 'telegram' || type === 'discord' || type === 'slack') && channelId && (
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        <h3 className="text-xs font-bold text-foreground">Webhook Configuration</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Callback URL</span>
                          <code className="text-[10px] bg-background border border-border p-1.5 rounded-lg select-all overflow-x-auto whitespace-nowrap">
                            {import.meta.env.VITE_API_URL}/webhooks/{type}/{config.token || config.bot_token || 'YOUR_TOKEN'}
                          </code>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                        {type === 'telegram' 
                          ? 'This is automatically set when you save. Use it for manual debug if needed.' 
                          : type === 'slack'
                          ? 'Copy this URL into Slack "Event Subscriptions" -> "Request URL".'
                          : 'Copy this URL into your Discord middleware or bot forwarder.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {type === 'voice' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Voice Provider</label>
                      <select className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                        <option>ElevenLabs</option>
                        <option>Google Cloud TTS</option>
                        <option>Azure Voice</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Language</label>
                      <select className="w-full bg-accent/30 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                        <option>English (US)</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-border/50">
                <div className="flex items-center gap-2">
                  {channelId && isConnected && (
                    <>
                      <button 
                        onClick={handleVerify}
                        disabled={isVerifying || isSyncing}
                        className="flex items-center gap-2 px-4 py-2 bg-accent/50 text-foreground border border-border rounded-xl text-xs font-bold hover:bg-accent transition-all cursor-pointer"
                      >
                        {isVerifying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                        Test Connection
                      </button>
                      {(type === 'telegram' || type === 'email' || type === 'whatsapp' || type === 'instagram' || type === 'facebook') && (
                        <button 
                          onClick={handleSync}
                          disabled={isSyncing || isVerifying}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground border border-border rounded-xl text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
                        >
                          {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Sync Messages
                        </button>
                      )}
                    </>
                  )}
                  {verificationResult && (
                    <span className={cn(
                      "text-[10px] font-bold",
                      verificationResult.success ? "text-emerald-500" : "text-red-500"
                    )}>
                      {verificationResult.detail}
                    </span>
                  )}
                </div>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Advanced Settings</h2>
              </div>
              <div className="space-y-4">
                {advancedSettings.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-accent/30 border border-border rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-foreground">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </div>
                    <button 
                      onClick={() => toggleSetting(item.id)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all duration-300 cursor-pointer flex items-center px-1",
                        config[item.id] ? "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-muted"
                      )}
                    >
                      <motion.div 
                        animate={{ x: config[item.id] ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-3 h-3 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                Quick Tips
              </h3>
              <ul className="space-y-3">
                {[
                  'Ensure your API keys are kept secure.',
                  'Test your connection after saving changes.',
                  'Enable auto-replies to improve customer satisfaction.',
                  'Monitor your SLA targets regularly.'
                ].map((tip, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-2 leading-relaxed">
                    <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Channel Health
              </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="text-emerald-500">{isConnected ? '99.9%' : '0%'}</span>
                    </div>
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                      <div className={cn("h-full bg-emerald-500", isConnected ? "w-[99.9%]" : "w-0")} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-muted-foreground">API Latency</span>
                      <span className="text-emerald-500">{isConnected ? '124ms' : 'N/A'}</span>
                    </div>
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                      <div className={cn("h-full bg-emerald-500", isConnected ? "w-[85%]" : "w-0")} />
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discord Intent Error Modal */}
      <Modal 
        isOpen={isErrorModalOpen} 
        onClose={() => setIsErrorModalOpen(false)} 
        title="Privileged Intents Required"
        className="max-w-md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-500">Missing Message Content Intent</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your Discord bot is connected, but it doesn't have permission to read message content. This is required for your AI to respond to users.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">How to fix this:</h4>
            <div className="space-y-3">
              {[
                "Go to the Discord Developer Portal.",
                "Select your application and click on the 'Bot' tab.",
                "Scroll down to 'Privileged Gateway Intents'.",
                "Toggle ON the 'Message Content Intent' switch.",
                "Click 'Save Changes'."
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <a 
              href="https://discord.com/developers/applications" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3 bg-primary text-primary-foreground rounded-2xl text-center text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 flex items-center justify-center gap-2"
            >
              Go to Developer Portal <ExternalLink className="w-4 h-4" />
            </a>
            <button 
              onClick={() => setIsErrorModalOpen(false)}
              className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              I've enabled it, let me try again
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
