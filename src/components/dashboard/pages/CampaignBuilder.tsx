import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Rocket, Plus, Trash2, MoveUp, MoveDown, 
  Newspaper, Map, CheckSquare, Megaphone, Smartphone, 
  Settings, Eye, Globe, Zap, Image as ImageIcon, Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { WidgetNewsCard } from '../../widget/WidgetNewsCard';
import { WidgetTourOverlay } from '../../widget/WidgetTourOverlay';
import { WidgetChecklist } from '../../widget/WidgetChecklist';
import { useToast } from '../../ui/Toast';

interface CampaignBuilderProps {
  workspaceId: string;
  campaignId: string | null;
  onBack: () => void;
}

type CampaignType = 'banner' | 'news' | 'tour' | 'checklist';

export const CampaignBuilder = ({ workspaceId, campaignId, onBack }: CampaignBuilderProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Basic Info
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<CampaignType>('news');
  const [status, setStatus] = useState<'draft' | 'running'>('draft');
  
  // Config for different types
  const [newsConfig, setNewsConfig] = useState({
    cta_label: 'Learn More',
    cta_url: '',
    accent_color: '#3b82f6'
  });
  
  const [tourSteps, setTourSteps] = useState<any[]>([
    { title: 'Welcome', body: 'This is the first step of your tour.', image_url: '' }
  ]);
  
  const [checklistItems, setChecklistItems] = useState<any[]>([
    { id: '1', title: 'Get started', description: 'Create your first workspace' }
  ]);

  const [category, setCategory] = useState('Product Update');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    setIsLoading(true);
    try {
      const data = await api.automations.campaigns.list(workspaceId);
      const campaign = data.find((c: any) => c.id === campaignId);
      if (campaign) {
        setName(campaign.name);
        setMessage(campaign.message);
        setType(campaign.type as CampaignType);
        setStatus(campaign.status);
        if (campaign.config) {
          if (campaign.type === 'news') setNewsConfig(campaign.config);
          if (campaign.type === 'tour') setTourSteps(campaign.config.steps || []);
          if (campaign.type === 'checklist') setChecklistItems(campaign.config.items || []);
        }
        if (campaign.category) setCategory(campaign.category);
        if (campaign.scheduled_at) {
          setScheduledAt(new Date(campaign.scheduled_at).toISOString().slice(0, 16));
          setIsScheduling(true);
        }
      }
    } catch (error) {
      toast("Error", "Failed to fetch campaign details", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (publish = false) => {
    if (!name.trim()) {
      toast("Validation Error", "Campaign name is required", "error");
      return;
    }
    if (!message.trim()) {
      toast("Validation Error", "Campaign message is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const config = 
        type === 'news' ? newsConfig :
        type === 'tour' ? { steps: tourSteps } :
        type === 'checklist' ? { items: checklistItems } : {};
      
      const payload = {
        name,
        message,
        type,
        status: publish ? (isScheduling ? 'scheduled' : 'running') : 'draft',
        config,
        category,
        scheduled_at: (publish && isScheduling) ? scheduledAt : null,
        audience_filters: {},
        channel: 'widget'
      };

      if (campaignId) {
        await api.automations.campaigns.update(campaignId, payload);
      } else {
        await api.automations.campaigns.create(workspaceId, payload);
      }
      
      toast("Success", `Campaign ${publish ? 'published' : 'saved'} successfully`, "success");
      onBack();
    } catch (error: any) {
      toast("Error", error.message || "Failed to save campaign", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const addTourStep = () => {
    setTourSteps([...tourSteps, { title: '', body: '', image_url: '' }]);
  };

  const removeTourStep = (index: number) => {
    setTourSteps(tourSteps.filter((_, i) => i !== index));
  };

  const updateTourStep = (index: number, field: string, value: string) => {
    const newSteps = [...tourSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setTourSteps(newSteps);
  };

  const addChecklistItem = () => {
    setChecklistItems([...checklistItems, { id: Math.random().toString(36).substr(2, 9), title: '', description: '' }]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const updateChecklistItem = (index: number, field: string, value: string) => {
    const newItems = [...checklistItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setChecklistItems(newItems);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-16 px-6 border-b flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-accent rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold tracking-tight">{campaignId ? 'Edit Campaign' : 'Create New Campaign'}</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              {type} • {status}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>
          <button 
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Rocket className="w-3.5 h-3.5" />
            Publish
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Editor */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          <div className="max-w-2xl mx-auto space-y-8">
            
            {/* Type Selector */}
            <section className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Campaign Type</label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: 'banner', label: 'Banner', icon: Megaphone },
                  { id: 'news', label: 'News', icon: Newspaper },
                  { id: 'tour', label: 'Tour', icon: Map },
                  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id as CampaignType)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all group",
                      type === t.id 
                        ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                        : "bg-card border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <t.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", type === t.id ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-[11px] font-bold", type === t.id ? "text-primary" : "text-muted-foreground")}>{t.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Basic Config */}
            <section className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Internal Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="E.g. Summer Sale Announcement"
                      className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Category</label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="E.g. Product Update"
                      className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Campaign Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your main message here..."
                    className="w-full bg-card border rounded-xl px-4 py-3 text-sm min-h-[120px] focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between p-4 bg-accent/20 rounded-2xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Rocket className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">Schedule for later</h4>
                        <p className="text-[10px] text-muted-foreground">Pick a specific time to launch this campaign.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsScheduling(!isScheduling)}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors relative",
                        isScheduling ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <motion.div 
                        animate={{ x: isScheduling ? 24 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-sm" 
                      />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isScheduling && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4"
                      >
                        <input
                          type="datetime-local"
                          value={scheduledAt || ''}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full bg-card border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/30 transition-all [color-scheme:dark]"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* Type Specific Fields */}
            <AnimatePresence mode="wait">
              {type === 'news' && (
                <motion.section 
                  key="news-config"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 pt-6 border-t"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg"><Zap className="w-4 h-4 text-blue-500" /></div>
                    <h3 className="text-sm font-bold">News Card Settings</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">CTA Button Label</label>
                      <input
                        value={newsConfig.cta_label}
                        onChange={(e) => setNewsConfig({ ...newsConfig, cta_label: e.target.value })}
                        placeholder="E.g. Learn More"
                        className="w-full bg-card border rounded-xl px-4 py-2.5 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">CTA URL</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          value={newsConfig.cta_url}
                          onChange={(e) => setNewsConfig({ ...newsConfig, cta_url: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-card border rounded-xl pl-9 pr-4 py-2.5 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newsConfig.accent_color}
                        onChange={(e) => setNewsConfig({ ...newsConfig, accent_color: e.target.value })}
                        className="w-12 h-12 rounded-xl bg-card border p-1 cursor-pointer"
                      />
                      <input
                        value={newsConfig.accent_color}
                        onChange={(e) => setNewsConfig({ ...newsConfig, accent_color: e.target.value })}
                        className="flex-1 bg-card border rounded-xl px-4 py-2.5 text-sm font-mono uppercase"
                      />
                    </div>
                  </div>
                </motion.section>
              )}

              {type === 'tour' && (
                <motion.section 
                  key="tour-config"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 pt-6 border-t"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-500/10 rounded-lg"><Map className="w-4 h-4 text-purple-500" /></div>
                      <h3 className="text-sm font-bold">Tour Steps</h3>
                    </div>
                    <button 
                      onClick={addTourStep}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Step
                    </button>
                  </div>

                  <div className="space-y-4">
                    {tourSteps.map((step, idx) => (
                      <div key={idx} className="p-5 rounded-2xl border bg-card/50 space-y-4 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Step {idx + 1}</span>
                          <button onClick={() => removeTourStep(idx)} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <input
                            value={step.title}
                            onChange={(e) => updateTourStep(idx, 'title', e.target.value)}
                            placeholder="Step Title"
                            className="w-full bg-card border rounded-xl px-4 py-2.5 text-sm font-bold"
                          />
                          <textarea
                            value={step.body}
                            onChange={(e) => updateTourStep(idx, 'body', e.target.value)}
                            placeholder="Step description..."
                            className="w-full bg-card border rounded-xl px-4 py-2.5 text-sm min-h-[80px] resize-none"
                          />
                          <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              value={step.image_url}
                              onChange={(e) => updateTourStep(idx, 'image_url', e.target.value)}
                              placeholder="Image URL (optional)"
                              className="w-full bg-card border rounded-xl pl-9 pr-4 py-2 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}

              {type === 'checklist' && (
                <motion.section 
                  key="checklist-config"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 pt-6 border-t"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg"><CheckSquare className="w-4 h-4 text-emerald-500" /></div>
                      <h3 className="text-sm font-bold">Checklist Items</h3>
                    </div>
                    <button 
                      onClick={addChecklistItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {checklistItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 p-4 rounded-2xl border bg-card/50 relative group">
                        <div className="mt-2 shrink-0"><div className="w-5 h-5 rounded-full border-2 border-muted" /></div>
                        <div className="flex-1 space-y-2">
                          <input
                            value={item.title}
                            onChange={(e) => updateChecklistItem(idx, 'title', e.target.value)}
                            placeholder="Item Title"
                            className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold"
                          />
                          <input
                            value={item.description}
                            onChange={(e) => updateChecklistItem(idx, 'description', e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-muted-foreground"
                          />
                        </div>
                        <button onClick={() => removeChecklistItem(idx)} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all h-fit">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="w-[450px] border-l bg-accent/20 flex flex-col p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Live Preview</span>
            </div>
            <div className="flex p-1 bg-card border rounded-xl">
              <button 
                onClick={() => setPreviewTheme('light')}
                className={cn("px-3 py-1 text-[10px] font-bold rounded-lg transition-all", previewTheme === 'light' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
              >
                Light
              </button>
              <button 
                onClick={() => setPreviewTheme('dark')}
                className={cn("px-3 py-1 text-[10px] font-bold rounded-lg transition-all", previewTheme === 'dark' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div className="flex-1 flex flex-col items-center justify-center relative scale-[0.9] origin-center">
            {/* Phone Frame Mockup */}
            <div className={cn(
              "w-[340px] h-[600px] rounded-[3rem] border-8 border-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.2)] overflow-hidden relative",
              previewTheme === 'dark' ? "bg-[#131316]" : "bg-slate-50"
            )}>
              {/* Top Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-zinc-950 rounded-b-2xl z-20" />
              
              {/* Mock Widget UI */}
              <div className="h-full flex flex-col pt-8">
                {/* Mock Header */}
                <div 
                  className="p-5 pb-6 text-white"
                  style={{ background: '#3b82f6' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20" />
                    <div>
                      <div className="w-24 h-3 bg-white/40 rounded-full mb-2" />
                      <div className="w-16 h-2 bg-white/20 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-4 space-y-5">
                  <div className="space-y-2 opacity-20">
                    <div className="w-1/2 h-2 bg-muted-foreground/30 rounded-full" />
                    <div className="w-full h-12 bg-muted-foreground/10 rounded-2xl border border-muted-foreground/10" />
                  </div>

                  {/* LIVE COMPONENT PREVIEW */}
                  <div className="relative z-10 space-y-4">
                    {type === 'banner' && (
                      <div className="bg-primary/10 border-b border-primary/20 p-3 flex items-center gap-3 rounded-xl">
                        <Megaphone className="w-4 h-4 text-primary shrink-0" />
                        <p className="text-[11px] font-medium text-primary leading-tight">{message || 'Banner message preview...'}</p>
                      </div>
                    )}

                    {type === 'news' && (
                      <WidgetNewsCard
                        id="preview"
                        name={name || 'News Title'}
                        message={message || 'News content preview...'}
                        config={newsConfig}
                        theme={previewTheme}
                        primaryColor="#3b82f6"
                        onDismiss={() => {}}
                        isPreview={true}
                      />
                    )}

                    {type === 'checklist' && (
                      <WidgetChecklist
                        id="preview"
                        name={name || 'Checklist Title'}
                        config={{ items: checklistItems }}
                        theme={previewTheme}
                        primaryColor="#3b82f6"
                      />
                    )}
                  </div>

                  <div className="space-y-2 opacity-20">
                    <div className="w-1/3 h-2 bg-muted-foreground/30 rounded-full" />
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-full h-10 bg-muted-foreground/5 rounded-xl border border-muted-foreground/5" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tour Overlay (Rendered as absolute over phone content) */}
                <AnimatePresence>
                  {type === 'tour' && (
                    <div className="absolute inset-0 z-50">
                      <WidgetTourOverlay
                        id="preview"
                        name={name || 'Tour'}
                        config={{ steps: tourSteps }}
                        theme={previewTheme}
                        primaryColor="#3b82f6"
                        onComplete={() => {}}
                        onDismiss={() => {}}
                        isPreview={true}
                      />
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="mt-8 flex items-center gap-2 text-muted-foreground opacity-50">
              <Smartphone className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Mobile View</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
