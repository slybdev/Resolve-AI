import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Globe, 
  Bot,
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  MessageSquare, 
  GraduationCap, 
  Settings, 
  Send,
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  Search,
  Database,
  Plus,
  X,
  ChevronDown,
  ChevronLeft,
  RefreshCw,
  Layers,
  ExternalLink,
  Check,
  Loader2,
  Play,
  User,
  BookOpen
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';
import { LetterAvatar } from '../ui/Avatar';

interface Step {
  id: number;
  title: string;
  subtitle: string;
}

const steps: Step[] = [
  { id: 1, title: 'Identity', subtitle: 'What should we call you?' },
  { id: 2, title: 'Profile', subtitle: 'What does your company do?' },
  { id: 3, title: 'Persona', subtitle: 'How should your AI behave?' },
  { id: 4, title: 'Knowledge', subtitle: 'Connect your sources' },
  { id: 5, title: 'Preview', subtitle: 'Experience the magic' }
];

export const OnboardingFlow = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceData, setWorkspaceData] = useState({
    name: '',
    industry: '',
    description: ''
  });
  const [aiData, setAiData] = useState({
    name: 'XentralDesk Assistant',
    personality: 'Professional',
    customInstructions: ''
  });
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  // Connector Setup States (from KnowledgeBase)
  const [selectedConnector, setSelectedConnector] = useState<any | null>(null);
  const [connectorForm, setConnectorForm] = useState<any>({});
  const [crawlMode, setCrawlMode] = useState<'single' | 'subpages' | 'site'>('subpages');
  const [maxDepth, setMaxDepth] = useState<number>(2);
  const [pageLimit, setPageLimit] = useState<number>(50);
  const [includePatterns, setIncludePatterns] = useState<string>('');
  const [excludePatterns, setExcludePatterns] = useState<string>('');
  const [crawlFrequency, setCrawlFrequency] = useState<'once' | 'daily' | 'weekly'>('once');
  const [contentFocus, setContentFocus] = useState<'docs' | 'blog' | 'mixed'>('docs');
  const [showAdvancedCrawler, setShowAdvancedCrawler] = useState(false);
  const [previewLinks, setPreviewLinks] = useState<{ url: string; title: string | null; selected: boolean }[] | null>(null);
  const [isPreviewingLinks, setIsPreviewingLinks] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // AI Preview States (from ResponseTesting)
  const [messages, setMessages] = useState<any[]>([
    { id: '1', role: 'ai', content: "Hi! I'm your new XentralDesk assistant. Once you finish setup, I'll be ready to help your customers based on the info you provided. Want to try a test question?" }
  ]);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'pending' | 'scraping' | 'chunking' | 'vectorizing' | 'ready'>('pending');
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingWorkspaces, setIsCheckingWorkspaces] = useState(true);

  useEffect(() => {
    const checkWorkspaces = async () => {
      try {
        const workspaces = await api.workspaces.list();
        if (workspaces && workspaces.length > 0) {
          // User already has a workspace, shouldn't be here
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
      } finally {
        setIsCheckingWorkspaces(false);
      }
    };
    checkWorkspaces();
  }, [navigate]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].id === '1') {
      const companyName = workspaceData.name || 'AI';
      setMessages([{
        id: '1',
        role: 'ai',
        content: `Hi! I'm your new ${companyName} assistant. Once you finish setup, I'll be ready to help your customers based on the info you provided. Want to try a test question?`
      }]);
    }
  }, [workspaceData.name]);

  if (isCheckingWorkspaces) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] animate-pulse">Initializing Setup...</p>
        </div>
      </div>
    );
  }

  // Optional: If you want to be extremely strict about the "signup" trigger, 
  // you could also check location.state?.fromSignup here. 
  // But allowing 0-workspace users to stay is safer for page refreshes.

  const handleNext = async () => {
    // Phase 1: Identity & Profile (Step 1-2)
    if (currentStep === 1 && !workspaceData.name) {
      toast('Workspace Name', 'Please name your AI realm first', 'info');
      return;
    }
    if (currentStep === 2) {
      const charCount = (workspaceData.description || '').length;
      if (charCount > 400) {
        toast('Description Too Long', 'Please keep your company description under 400 characters', 'error');
        return;
      }
    }

    // Phase 2: Create Workspace (Transition 3 -> 4)
    if (currentStep === 3) {
      setIsLoading(true);
      try {
        const response = await api.onboarding.setup({
          workspace_name: workspaceData.name,
          company_description: workspaceData.description,
          industry: workspaceData.industry,
          ai_agent_name: aiData.name,
          ai_tone: aiData.personality.toLowerCase(),
          ai_custom_instructions: aiData.customInstructions
        });
        
        setWorkspaceId(response.workspace.id);
        setCurrentStep(4);
      } catch (err: any) {
        toast('Setup Error', err.message || 'Failed to initialize workspace', 'error');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Phase 3: Finalize Knowledge (Transition 4 -> 5)
    if (currentStep === 4) {
      setCurrentStep(5);
      return;
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final Finish - Set active workspace and redirect
      if (workspaceId) {
        localStorage.setItem('active_workspace_id', workspaceId);
      }
      navigate('/dashboard');
    }
  };

  const handlePreviewLinks = async () => {
    if (!connectorForm.url || !workspaceId) {
      toast('Invalid URL', 'Please enter a valid website URL first.', 'error');
      return;
    }
    
    setIsPreviewingLinks(true);
    try {
      const response = await api.knowledge.documents.previewWebsiteLinks(workspaceId, {
        url: connectorForm.url,
        crawl_mode: crawlMode,
        max_depth: maxDepth,
        include_patterns: includePatterns.split(',').map(p => p.trim()).filter(Boolean),
        exclude_patterns: excludePatterns.split(',').map(p => p.trim()).filter(Boolean),
        content_focus: contentFocus
      });
      setPreviewLinks(response.links.map((l: any) => ({ ...l, selected: true })));
    } catch (e: any) {
      toast('Preview Failed', e.message || 'Could not fetch website links', 'error');
    } finally {
      setIsPreviewingLinks(false);
    }
  };

  const pollDocumentStatus = async (docId: string) => {
    if (!workspaceId) return;
    
    setIsProcessing(true);
    setProcessingStatus('pending');

    // Simulate animated progression for sleek UX while waiting for actual backend 'ready' status
    const timer1 = setTimeout(() => setProcessingStatus(prev => prev === 'pending' || prev === 'scraping' ? 'chunking' : prev), 4000);
    const timer2 = setTimeout(() => setProcessingStatus(prev => prev === 'chunking' ? 'vectorizing' : prev), 8000);

    const poll = async () => {
      try {
        const doc = await api.knowledge.documents.get(workspaceId, docId);
        
        if (doc.status === 'ready') {
          clearTimeout(timer1);
          clearTimeout(timer2);
          setProcessingStatus('ready');
          
          setTimeout(() => {
            setIsProcessing(false);
            setCurrentStep(5);
          }, 1000);
          return;
        } else if (doc.status === 'error' || doc.status === 'failed') {
          clearTimeout(timer1);
          clearTimeout(timer2);
          setIsProcessing(false);
          toast('Error', 'Knowledge ingestion failed', 'error');
          return;
        }
        setTimeout(poll, 1500);
      } catch (err) {
        console.error('Polling failed', err);
        setTimeout(poll, 3000);
      }
    };
    poll();
  };

  const handlePreviewSend = async () => {
    if (!userInput.trim() || !workspaceId) return;
    
    const message = userInput;
    const userMsg = { id: Date.now().toString(), role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setUserInput('');
    
    try {
      const response = await api.ai.query(workspaceId, message, undefined, conversationId);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.answer,
        confidence: response.confidence_score,
        sources: (response.sources || []).map((s: any) => ({
          title: s.title,
          score: s.score,
          content: s.content,
          url: s.url
        }))
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      toast('Error', err.message || 'AI Query failed', 'error');
      setMessages(prev => [...prev, { 
        id: 'err',
        role: 'ai', 
        content: "I'm having trouble connecting to my knowledge core right now. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 w-full max-w-xl">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="text-3xl font-black text-white tracking-tight leading-tight">First, let's name your realm</h2>
        <p className="text-neutral-400 text-base">Your workspace is where all your knowledge and AI magic live.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Workspace Name</label>
          <div className="relative group">
            <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              value={workspaceData.name}
              onChange={(e) => setWorkspaceData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Acme Corp" 
              className="w-full bg-neutral-900 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all shadow-2xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Industry</label>
          <div className="grid grid-cols-2 gap-3">
            {['SaaS', 'E-commerce', 'Tech Support', 'Professional Services'].map(industry => (
              <button
                key={industry}
                onClick={() => setWorkspaceData(prev => ({ ...prev, industry }))}
                className={cn(
                  "px-4 py-4 rounded-2xl border text-sm font-bold transition-all text-center",
                  workspaceData.industry === industry 
                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]" 
                    : "bg-neutral-900 border-white/5 text-neutral-500 hover:border-white/20"
                )}
              >
                {industry}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderStep2 = () => {
    const charCount = (workspaceData.description || '').length;
    
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 w-full max-w-xl">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white tracking-tight">Teach the AI about {workspaceData.name}</h2>
          <p className="text-neutral-400 text-base">The better the bio, the more accurate the initial responses.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Company Description</label>
          <textarea 
            value={workspaceData.description}
            onChange={(e) => setWorkspaceData(prev => ({ ...prev, description: e.target.value }))}
            maxLength={400}
            placeholder="Acme Corp provides automated logistics solutions for global enterprises. We specialize in real-time tracking and warehouse optimization..."
            className="w-full bg-neutral-900 border border-white/10 rounded-3xl px-6 py-6 text-base h-64 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all resize-none shadow-2xl leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              <p className="text-[10px] text-neutral-500 font-medium">This description serves as the "identity core" for your agent.</p>
            </div>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest transition-colors duration-200",
              charCount > 400 ? "text-red-500" : "text-neutral-500"
            )}>
              {charCount} / 400 characters
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderStep3 = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 w-full max-w-xl">
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-white tracking-tight">Craft your AI Persona</h2>
        <p className="text-neutral-400 text-base">Define how your agent speaks and behaves.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">AI Agent Name</label>
          <div className="relative group">
            <Bot className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              value={aiData.name}
              onChange={(e) => setAiData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Acme Support Bot" 
              className="w-full bg-neutral-900 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-xl font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all shadow-2xl"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Tone & Communication Style</label>
          <div className="grid grid-cols-3 gap-2">
            {['Professional', 'Friendly', 'Technical'].map(tone => (
              <button
                key={tone}
                onClick={() => setAiData(prev => ({ ...prev, personality: tone }))}
                className={cn(
                  "px-3 py-3 rounded-xl border text-xs font-bold transition-all",
                  aiData.personality === tone 
                    ? "bg-primary/10 border-primary text-primary" 
                    : "bg-neutral-900 border-white/5 text-neutral-500 hover:border-white/20"
                )}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 w-full max-w-3xl">
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-white tracking-tight leading-none">Fuel your AI with Knowledge</h2>
        <p className="text-neutral-400 text-base">Connect your sources to give your assistant surgical precision.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
        {!selectedConnector ? (
          <div className="p-8 grid grid-cols-2 gap-4">
            {[
              { id: 'website', name: 'Website Crawler', icon: Globe, color: 'text-blue-400', desc: 'Sync any public URL' },
              { id: 'files', name: 'PDF/Docs', icon: Database, color: 'text-yellow-400', desc: 'Upload local files' },
              { id: 'notion', name: 'Notion', icon: Zap, color: 'text-white', desc: 'Sync workspace pages' },
              { id: 'confluence', name: 'Confluence', icon: BookOpen, color: 'text-blue-500', desc: 'Sync team docs' },
            ].map((connector) => (
              <button 
                key={connector.id}
                onClick={() => setSelectedConnector(connector)}
                className="flex flex-col items-center text-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-primary/50 hover:bg-white/[0.05] transition-all group cursor-pointer"
              >
                <connector.icon className={cn("w-8 h-8 mb-4 transition-transform group-hover:scale-110", connector.color)} />
                <span className="text-sm font-bold text-white mb-1 tracking-tight">{connector.name}</span>
                <span className="text-[10px] text-neutral-500 leading-tight uppercase font-bold tracking-widest">{connector.desc}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center", selectedConnector.color)}>
                  <selectedConnector.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-none">{selectedConnector.name}</h3>
                  <p className="text-xs text-neutral-500 mt-1">Configure your sync settings</p>
                </div>
              </div>
              <button onClick={() => { setSelectedConnector(null); setPreviewLinks(null); }} className="text-xs font-bold text-neutral-500 hover:text-white transition-colors">
                Change Source
              </button>
            </div>

            {selectedConnector.id === 'website' && (
              <div className="space-y-6">
                {!previewLinks ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Base URL</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="https://docs.example.com"
                          value={connectorForm.url || ''}
                          onChange={(e) => setConnectorForm({ ...connectorForm, url: e.target.value })}
                          className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-white"
                        />
                        <button 
                          onClick={handlePreviewLinks}
                          disabled={isPreviewingLinks || !connectorForm.url}
                          className="px-6 py-3 bg-white text-black font-black text-xs rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {isPreviewingLinks ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          Scan
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <button 
                        onClick={() => setShowAdvancedCrawler(!showAdvancedCrawler)}
                        className="flex items-center gap-2 text-[10px] font-bold text-primary hover:opacity-80 transition-all uppercase tracking-widest"
                      >
                        <ChevronDown className={cn("w-3 h-3 transition-transform", showAdvancedCrawler && "rotate-180")} />
                        Advanced Crawler Settings
                      </button>
                    </div>

                    <AnimatePresence>
                      {showAdvancedCrawler && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-4 pt-2"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Crawl Mode</label>
                              <select 
                                value={crawlMode}
                                onChange={(e) => setCrawlMode(e.target.value as any)}
                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                              >
                                <option value="single">Single Page</option>
                                <option value="subpages">Follow Subpages</option>
                                <option value="site">Entire Domain</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Max Depth</label>
                              <input 
                                type="number" min="1" max="5"
                                value={maxDepth}
                                onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-xs text-white"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        Discovered Pages <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-[10px]">{previewLinks.length}</span>
                      </h4>
                      <button onClick={() => setPreviewLinks(null)} className="text-[10px] font-bold text-neutral-500 hover:text-white uppercase">Reset Scan</button>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto border border-white/5 rounded-2xl bg-black/20 divide-y divide-white/5 no-scrollbar">
                      {previewLinks.map((link, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            const newLinks = [...previewLinks];
                            newLinks[idx].selected = !newLinks[idx].selected;
                            setPreviewLinks(newLinks);
                          }}
                          className="p-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                            link.selected ? "bg-primary border-primary text-primary-foreground" : "border-white/20"
                          )}>
                            {link.selected && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{link.title || 'Untitled Page'}</p>
                            <p className="text-[9px] text-neutral-500 truncate font-mono">{link.url}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const selectedUrls = previewLinks.filter(l => l.selected).map(l => l.url);
                          const response = await api.knowledge.documents.scrapeWebsite(workspaceId!, {
                            url: connectorForm.url,
                            name: connectorForm.name || `Onboarding: ${connectorForm.url}`,
                            crawl_mode: crawlMode,
                            max_depth: maxDepth,
                            page_limit: pageLimit,
                            target_urls: selectedUrls
                          });
                          toast('Success', 'Knowledge integration started!', 'success');
                          
                          // The scrape response contains the document info
                          if (response && response.id) {
                            pollDocumentStatus(response.id);
                          } else {
                            handleNext();
                          }
                        } catch (err: any) {
                          toast('Error', err.message || 'Failed to start ingestion', 'error');
                          setIsLoading(false);
                        }
                      }}
                      className="w-full py-4 bg-primary text-primary-foreground font-black text-sm rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      BUILD AI REALM
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {selectedConnector.id === 'files' && (
              <div className="space-y-6">
                <div className="relative p-12 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center hover:border-primary/50 transition-all cursor-pointer group bg-black/20">
                  <input 
                    type="file" 
                    accept=".pdf,.txt,.docx"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setSelectedFile(file);
                    }}
                  />
                  {selectedFile ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto shadow-lg">
                        <Database className="w-8 h-8" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white block mb-1">{selectedFile.name}</span>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest">
                        Remove File
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 mb-4 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                        <Plus className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-bold text-white mb-1">Upload Knowledge Base</span>
                      <span className="text-xs text-neutral-500">Drop your PDF, TXT, or DOCX here</span>
                    </>
                  )}
                </div>

                <button 
                  onClick={async () => {
                    if (!selectedFile || !workspaceId) return;
                    setIsLoading(true);
                    try {
                      const response = await api.knowledge.documents.upload(workspaceId, selectedFile);
                      toast('Success', 'File uploaded and processing!', 'success');
                      
                      // The upload response contains the document info
                      if (response && response.id) {
                        pollDocumentStatus(response.id);
                      } else {
                        handleNext();
                      }
                    } catch (err: any) {
                      toast('Error', err.message || 'Failed to upload file', 'error');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={!selectedFile || isLoading}
                  className="w-full py-4 bg-primary text-primary-foreground font-black text-sm rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                  BUILD AI REALM
                </button>
              </div>
            )}

            {(selectedConnector.id === 'notion' || selectedConnector.id === 'confluence' || selectedConnector.id === 'guru') && (
              <div className="p-10 text-center space-y-4">
                <selectedConnector.icon className={cn("w-12 h-12 mx-auto opacity-50", selectedConnector.color)} />
                <h4 className="text-sm font-bold text-white">Full Integration Support</h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  You can connect {selectedConnector.name} in the dashboard after setup. For onboarding, let's start with a Website or Local File to get your AI live instantly.
                </p>
                <button onClick={() => setSelectedConnector(null)} className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-all">
                  Try Website instead
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderStep5 = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 w-full max-w-3xl h-[600px] flex flex-col">
      <div className="text-center space-y-2 shrink-0">
        <h2 className="text-4xl font-black text-white tracking-tight leading-none">Witness the Magic</h2>
        <p className="text-neutral-400 text-lg">Your {aiData.name} is now live and context-aware.</p>
      </div>

      <div className="flex-1 bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-4 max-w-[85%]", msg.role === 'ai' ? "ml-0" : "ml-auto flex-row-reverse")}>
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                msg.role === 'ai' ? "bg-primary/20 border border-primary/20" : "bg-neutral-800 border border-white/10"
              )}>
                {msg.role === 'ai' ? (
                  <Bot className="w-6 h-6 text-primary" />
                ) : (
                  <User className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <div className={cn("space-y-2", msg.role === 'user' && "text-right")}>
                <div className={cn(
                  "p-5 rounded-3xl text-sm leading-relaxed border shadow-sm",
                  msg.role === 'ai' 
                    ? "bg-white/5 border-white/10 text-neutral-200 rounded-tl-none" 
                    : "bg-primary text-primary-foreground border-primary/20 rounded-tr-none shadow-primary/10"
                )}>
                  {msg.content}
                </div>
                {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                    {msg.sources.slice(0, 2).map((source: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-neutral-500">
                        <BookOpen className="w-3 h-3 text-primary" />
                        <span className="font-bold truncate max-w-[100px]">{source.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 max-w-[85%] ml-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-primary/20 border border-primary/20">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 px-5 py-3 bg-white/5 border border-white/10 rounded-3xl rounded-tl-none">
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/10">
          <div className="relative flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Ask your assistant anything..."
              value={userInput}
              onKeyDown={(e) => e.key === 'Enter' && handlePreviewSend()}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 h-14 bg-black/40 border border-white/10 rounded-2xl px-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 pl-14"
            />
            <div className="absolute left-5 text-neutral-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <button 
              onClick={handlePreviewSend}
              disabled={isLoading || !userInput.trim()}
              className="absolute right-2 w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Identity Active: {aiData.personality} Persona</p>
            <button 
              onClick={handleNext}
              className="px-6 py-2 bg-primary text-primary-foreground font-black text-xs rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              LAUNCH PLATFORM
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="dark min-h-screen bg-black flex flex-col text-white font-sans selection:bg-primary/30 antialiased">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[160px]" />
      </div>

      <header className="h-16 flex items-center justify-between px-8 bg-transparent sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center border border-white/20 shadow-2xl shadow-primary/20">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter text-white block leading-none mb-1">XentralDesk</span>
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em]">{workspaceData.name || 'Onboarding'}</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <nav className="hidden md:flex gap-4">
            {steps.map(s => (
              <div key={s.id} className={cn("flex flex-col items-center gap-1.5 transition-all duration-500", currentStep === s.id ? "opacity-100" : "opacity-30")}>
                <div className={cn("h-1 w-12 rounded-full transition-all duration-500", currentStep >= s.id ? "bg-primary" : "bg-neutral-800")} />
                <span className="text-[10px] font-black uppercase tracking-widest">{s.title}</span>
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-6 px-4 sm:px-8 lg:px-12 relative z-10 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </AnimatePresence>

        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-6"
            >
              <div className="w-full max-w-lg space-y-12">
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 animate-pulse transition-all">
                      <BrainCircuit className="w-12 h-12 text-primary" />
                    </div>
                    <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse" />
                  </div>
                  <h2 className="text-4xl font-black text-white tracking-tight">Initializing AI Brain</h2>
                  <p className="text-neutral-400">Processing your knowledge sources for surgical precision.</p>
                </div>

                <div className="space-y-6">
                  {[
                    { 
                      id: 'pending', 
                      label: selectedConnector?.id === 'website' && (connectorForm.url || connectorForm.name)
                        ? `Scraping Website: ${connectorForm.url || connectorForm.name}`
                        : selectedConnector?.id === 'files' && selectedFile
                        ? `Analyzing File: ${selectedFile.name}`
                        : 'Analyzing Data Structure', 
                      icon: Search,
                      matchIds: ['pending', 'scraping'] 
                    },
                    { id: 'chunking', label: 'Semantic Chunking & Context Mapping', icon: Layers, matchIds: ['chunking'] },
                    { id: 'vectorizing', label: 'Generating High-Dimensional Embeddings', icon: Sparkles, matchIds: ['vectorizing'] },
                    { id: 'ready', label: 'AI Realm Fully Initialized', icon: CheckCircle2, matchIds: ['ready'] }
                  ].map((step, idx) => {
                    const statusOrder = ['pending', 'scraping', 'chunking', 'vectorizing', 'ready'];
                    const mappedProcessingStatus = processingStatus === 'scraping' ? 'scraping' : processingStatus;
                    const currentIdx = statusOrder.indexOf(mappedProcessingStatus);
                    const stepIdx = Math.max(...step.matchIds.map(id => statusOrder.indexOf(id)));
                    const isActive = step.matchIds.includes(mappedProcessingStatus);
                    const isCompleted = stepIdx < currentIdx && !isActive;

                    return (
                      <div key={step.id} className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500",
                        isActive ? "bg-primary/10 border-primary text-white scale-[1.02] shadow-lg shadow-primary/10" : 
                        isCompleted ? "bg-white/5 border-white/10 text-neutral-400" :
                        "bg-transparent border-transparent text-neutral-600 opacity-40"
                      )}>
                        <div className="flex-1">
                          <p className="text-sm font-bold tracking-tight">{step.label}</p>
                          {isActive && step.id !== 'ready' && (
                            <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="h-full bg-primary"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 w-full max-w-xl flex items-center justify-between gap-4">
          {currentStep > 1 && currentStep < 4 && (
            <button 
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-6 py-3 rounded-2xl border border-white/5 bg-white/[0.02] text-neutral-400 font-bold hover:bg-white/[0.05] transition-all"
            >
              Back
            </button>
          )}
          {currentStep < 4 && (
            <button
              onClick={handleNext}
              disabled={isLoading || (currentStep === 1 && !workspaceData.name) || (currentStep === 2 && !workspaceData.description)}
              className={cn(
                "flex-1 py-3 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all relative overflow-hidden group shadow-2xl",
                "bg-white text-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              )}
            >
              {isLoading ? (
                <div className="flex gap-1.5">
                  {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-black animate-bounce" style={{animationDelay: `${i*0.1}s`}} />)}
                </div>
              ) : (
                <>
                  Next Step
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          )}
        </div>
      </main>

      <footer className="h-14 border-t border-white/5 flex items-center justify-center px-8 bg-black/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3 opacity-30">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black tracking-widest uppercase">Safe & Encrypted • Powered by XentralDesk Engine v2.0</span>
        </div>
      </footer>
    </div>
  );
};
