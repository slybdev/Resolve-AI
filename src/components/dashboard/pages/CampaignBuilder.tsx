import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Rocket, Plus, Trash2, MoveUp, MoveDown, 
  Newspaper, Map, CheckSquare, Megaphone, Smartphone, 
  Settings, Eye, Globe, Zap, Image as ImageIcon, Link as LinkIcon,
  Palette, FileText, CheckCircle2, Type
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { WidgetNewsCard } from '../../widget/WidgetNewsCard';
import { WidgetTourOverlay } from '../../widget/WidgetTourOverlay';
import { WidgetChecklist } from '../../widget/WidgetChecklist';
import { useToast } from '../../ui/Toast';
import { loadGoogleFont } from '@/src/lib/fonts';

interface CampaignBuilderProps {
  workspaceId: string;
  campaignId: string | null;
  onBack: () => void;
}

type CampaignType = 'banner' | 'news' | 'tour' | 'checklist';

// Font choices
const FONTS = [
  'Inter',
  'Poppins',
  'Playfair Display',
  'Outfit',
  'JetBrains Mono',
  'Roboto',
  'Montserrat',
  'Lora',
  'Open Sans',
  'Raleway',
  'Merriweather',
  'Lato',
  'Cinzel',
  'Fira Code'
];

// Presets for quick styling
const STYLE_PRESETS = [
  { name: 'Sleek Dark', bg: '#1e1f22', text: '#d1d5db', title: '#ffffff', buttonBg: '#6366f1', buttonText: '#ffffff', layout: 'default' },
  { name: 'Emerald', bg: '#064e3b', text: '#d1fae5', title: '#ffffff', buttonBg: '#10b981', buttonText: '#ffffff', layout: 'default' },
  { name: 'Glassmorphism', bg: '#1f2937', text: '#f3f4f6', title: '#ffffff', buttonBg: '#3b82f6', buttonText: '#ffffff', layout: 'glass' },
  { name: 'Minimalist', bg: '#ffffff', text: '#4b5563', title: '#111827', buttonBg: '#2563eb', buttonText: '#ffffff', layout: 'minimal' },
  { name: 'Cyber Gradient', bg: '#0f172a', bgEnd: '#3b0764', text: '#e2e8f0', title: '#ffffff', buttonBg: '#ffffff', buttonText: '#0f172a', layout: 'gradient' }
];

// Template items
interface CampaignTemplate {
  id: string;
  name: string;
  type: CampaignType;
  category: string;
  message: string;
  config: any;
  styling: {
    font_family: string;
    bg_color: string;
    bg_gradient_end?: string;
    text_color: string;
    title_color: string;
    title_font_size?: number;
    body_font_size?: number;
    button_bg_color?: string;
    button_text_color?: string;
    button_border_radius: 'rounded-none' | 'rounded-lg' | 'rounded-xl' | 'rounded-full';
    layout_variant: 'default' | 'gradient' | 'minimal' | 'glass';
    header_image?: string;
    header_image_placement?: 'top' | 'cover';
  };
  previewThumb: string;
}

const TEMPLATES: CampaignTemplate[] = [
  {
    id: 'banner_holiday',
    name: 'Holiday Discount Banner',
    type: 'banner',
    category: 'Promotion',
    message: '✨ Holiday Special! Get 20% off all plans with code HOLIDAY20 at checkout. Offer ends Sunday!',
    styling: {
      font_family: 'Outfit',
      bg_color: '#ef4444',
      text_color: '#ffffff',
      title_color: '#ffffff',
      title_font_size: 13,
      body_font_size: 12,
      button_border_radius: 'rounded-full',
      layout_variant: 'default'
    },
    config: {},
    previewThumb: '🎈'
  },
  {
    id: 'banner_maintenance',
    name: 'Scheduled Maintenance Alert',
    type: 'banner',
    category: 'System',
    message: '⚠️ Scheduled System Maintenance tonight at 10 PM - 11 PM UTC. Minor downtime expected.',
    styling: {
      font_family: 'JetBrains Mono',
      bg_color: '#ea580c',
      text_color: '#ffffff',
      title_color: '#ffffff',
      title_font_size: 13,
      body_font_size: 11,
      button_border_radius: 'rounded-none',
      layout_variant: 'default'
    },
    config: {},
    previewThumb: '🔧'
  },
  {
    id: 'banner_premium',
    name: 'Upgrade Plan Callout',
    type: 'banner',
    category: 'Premium Upgrade',
    message: '⭐ Unlock advanced analytics, custom domain portals, and multi-team chat triggers by upgrading to Premium.',
    styling: {
      font_family: 'Poppins',
      bg_color: '#0f172a',
      text_color: '#e2e8f0',
      title_color: '#ffffff',
      title_font_size: 13,
      body_font_size: 12,
      button_border_radius: 'rounded-lg',
      layout_variant: 'gradient',
      bg_gradient_end: '#3b82f6'
    },
    config: {},
    previewThumb: '⭐'
  },
  {
    id: 'news_smart_workflows',
    name: 'Introducing Smart Workflows',
    type: 'news',
    category: 'Product Update',
    message: '🚀 Automate your ticket routing, auto-escalate breached SLAs, and trigger webhook alerts instantly using our new Smart Workflows builder.\n\nSet triggers, conditions, and actions in a simple flowchart interface.',
    styling: {
      font_family: 'Poppins',
      bg_color: '#1e1b4b',
      bg_gradient_end: '#4f46e5',
      text_color: '#d1d5db',
      title_color: '#ffffff',
      title_font_size: 15,
      body_font_size: 13,
      button_bg_color: '#ffffff',
      button_text_color: '#4f46e5',
      button_border_radius: 'rounded-full',
      layout_variant: 'gradient'
    },
    config: {
      cta_label: 'Try Builder',
      cta_url: '/dashboard?view=workflows'
    },
    previewThumb: '⚡'
  },
  {
    id: 'news_announcement',
    name: 'We hit 10k Customers!',
    type: 'news',
    category: 'Company Milestone',
    message: '❤️ We are thrilled to announce that over 10,000 teams now trust ResolveAI for customer support operations.\n\nRead our journey, milestones, and a special note of gratitude from our founders.',
    styling: {
      font_family: 'Playfair Display',
      bg_color: '#064e3b',
      text_color: '#e2e8f0',
      title_color: '#ffffff',
      title_font_size: 18,
      body_font_size: 13,
      button_bg_color: '#10b981',
      button_text_color: '#ffffff',
      button_border_radius: 'rounded-xl',
      layout_variant: 'default',
      header_image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop',
      header_image_placement: 'cover'
    },
    config: {
      cta_label: 'Read Letter',
      cta_url: 'https://example.com/milestone'
    },
    previewThumb: '🏆'
  },
  {
    id: 'news_webinar',
    name: 'Masterclass: Scaling CX in 2026',
    type: 'news',
    category: 'Event Invite',
    message: '📅 Learn the exact systems, frameworks, and AI configurations used by high-growth startups to scale support without expanding headcount.\n\nLive webinar with Q&A session.',
    styling: {
      font_family: 'Outfit',
      bg_color: '#ffffff',
      text_color: '#475569',
      title_color: '#0f172a',
      title_font_size: 16,
      body_font_size: 12,
      button_bg_color: '#ea580c',
      button_text_color: '#ffffff',
      button_border_radius: 'rounded-xl',
      layout_variant: 'glass'
    },
    config: {
      cta_label: 'Reserve Seat',
      cta_url: 'https://example.com/webinar'
    },
    previewThumb: '🎤'
  },
  {
    id: 'tour_dashboard',
    name: 'Dashboard Guided Tour',
    type: 'tour',
    category: 'User Onboarding',
    message: 'Quick introductory walkthrough of the workspace features.',
    styling: {
      font_family: 'Poppins',
      bg_color: '#1e1c24',
      bg_gradient_end: '#3b0764',
      text_color: '#d8b4fe',
      title_color: '#ffffff',
      title_font_size: 16,
      body_font_size: 12,
      button_border_radius: 'rounded-full',
      layout_variant: 'gradient'
    },
    config: {
      steps: [
        { title: 'Welcome to ResolveAI', body: 'This tour will help you navigate your new support workspace dashboard.' },
        { title: 'Dynamic Unified Inbox', body: 'View, filter, claim, and reply to live chats, email tickets, and voice queries all in one feed.' },
        { title: 'AI Training Settings', body: 'Simply drop your help center URLs or documents to train your AI Agent in under 60 seconds.' }
      ]
    },
    previewThumb: '🧭'
  },
  {
    id: 'tour_bot_training',
    name: 'AI Agent Training Tour',
    type: 'tour',
    category: 'AI Agent Setup',
    message: 'Learn how to inject knowledge resources to feed your support bot.',
    styling: {
      font_family: 'Outfit',
      bg_color: '#ffffff',
      text_color: '#475569',
      title_color: '#0f172a',
      title_font_size: 15,
      body_font_size: 12,
      button_border_radius: 'rounded-xl',
      layout_variant: 'glass'
    },
    config: {
      steps: [
        { title: 'AI Settings Tab', body: 'Locate Settings > AI Agent to customize response tone and custom signature responses.' },
        { title: 'Add Data Source', body: 'Click Add Resource to drop website sitemaps, PDF guides, or text files directly.' },
        { title: 'Test Playground', body: 'Use our offline debug chat simulator to check how the AI matches and formats replies.' }
      ]
    },
    previewThumb: '🤖'
  },
  {
    id: 'checklist_onboarding',
    name: 'Account Onboarding Steps',
    type: 'checklist',
    category: 'User Onboarding',
    message: 'Getting started guide for new accounts.',
    styling: {
      font_family: 'Outfit',
      bg_color: '#ffffff',
      text_color: '#475569',
      title_color: '#0f172a',
      title_font_size: 14,
      body_font_size: 12,
      button_border_radius: 'rounded-xl',
      layout_variant: 'default'
    },
    config: {
      items: [
        { id: 'item_1', title: 'Complete your profile', description: 'Add your agent bio, avatar image, and notification preferences.' },
        { id: 'item_2', title: 'Set up business hours', description: 'Configure SLA monitors and reply timers.' },
        { id: 'item_3', title: 'Connect a live channel', description: 'Embed the chat widget or authorize your support email.' }
      ]
    },
    previewThumb: '✅'
  },
  {
    id: 'checklist_advanced_setup',
    name: 'Advanced Integration Steps',
    type: 'checklist',
    category: 'Integrations',
    message: 'Guide to connect webhooks and third party integrations.',
    styling: {
      font_family: 'JetBrains Mono',
      bg_color: '#0f172a',
      text_color: '#cbd5e1',
      title_color: '#38bdf8',
      title_font_size: 13,
      body_font_size: 11,
      button_border_radius: 'rounded-none',
      layout_variant: 'default'
    },
    config: {
      items: [
        { id: 'adv_1', title: 'Generate Workspace API Keys', description: 'Navigate to API Keys and copy the Client Secret safely.' },
        { id: 'adv_2', title: 'Webhook Endpoint Registration', description: 'Insert your server webhook listener URL to catch ticket updates.' },
        { id: 'adv_3', title: 'Verify Connection Ping', description: 'Click Ping Server to dispatch a fake JSON payload.' }
      ]
    },
    previewThumb: '🔌'
  }
];

export const CampaignBuilder = ({ workspaceId, campaignId, onBack }: CampaignBuilderProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Tab control
  const [activeEditorTab, setActiveEditorTab] = useState<'content' | 'design' | 'templates'>('content');

  // Basic Info
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<CampaignType>('news');
  const [status, setStatus] = useState<'draft' | 'running'>('draft');
  const [category, setCategory] = useState('Product Update');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Configs
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

  // Deep Customization Styling States
  const [fontFamily, setFontFamily] = useState('Inter');
  const [bgColor, setBgColor] = useState('');
  const [bgGradientEnd, setBgGradientEnd] = useState('');
  const [textColor, setTextColor] = useState('');
  const [titleColor, setTitleColor] = useState('');
  const [titleFontSize, setTitleFontSize] = useState<number>(14);
  const [bodyFontSize, setBodyFontSize] = useState<number>(12);
  const [buttonBgColor, setButtonBgColor] = useState('');
  const [buttonTextColor, setButtonTextColor] = useState('');
  const [buttonBorderRadius, setButtonBorderRadius] = useState<'rounded-none' | 'rounded-lg' | 'rounded-xl' | 'rounded-full'>('rounded-xl');
  const [layoutVariant, setLayoutVariant] = useState<'default' | 'gradient' | 'minimal' | 'glass'>('default');
  const [headerImage, setHeaderImage] = useState('');
  const [headerImagePlacement, setHeaderImagePlacement] = useState<'top' | 'cover'>('top');
  const [coverOverlayOpacity, setCoverOverlayOpacity] = useState<number>(75);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'banner' | 'news' | 'tour' | 'checklist'>('all');

  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Dynamic loading of selected Google Font
    if (fontFamily) {
      loadGoogleFont(fontFamily);
    }
  }, [fontFamily]);

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
        if (campaign.category) setCategory(campaign.category);
        if (campaign.scheduled_at) {
          setScheduledAt(new Date(campaign.scheduled_at).toISOString().slice(0, 16));
          setIsScheduling(true);
        }

        if (campaign.config) {
          if (campaign.type === 'news') {
            setNewsConfig({
              cta_label: campaign.config.cta_label || 'Learn More',
              cta_url: campaign.config.cta_url || '',
              accent_color: campaign.config.accent_color || '#3b82f6'
            });
          }
          if (campaign.type === 'tour') setTourSteps(campaign.config.steps || []);
          if (campaign.type === 'checklist') setChecklistItems(campaign.config.items || []);
          
          // Styling mapping
          setFontFamily(campaign.config.font_family || 'Inter');
          setBgColor(campaign.config.bg_color || '');
          setBgGradientEnd(campaign.config.bg_gradient_end || '');
          setTextColor(campaign.config.text_color || '');
          setTitleColor(campaign.config.title_color || '');
          setTitleFontSize(campaign.config.title_font_size || 14);
          setBodyFontSize(campaign.config.body_font_size || 12);
          setButtonBgColor(campaign.config.button_bg_color || '');
          setButtonTextColor(campaign.config.button_text_color || '');
          setButtonBorderRadius(campaign.config.button_border_radius || 'rounded-xl');
          setLayoutVariant(campaign.config.layout_variant || 'default');
          setHeaderImage(campaign.config.header_image || '');
          setHeaderImagePlacement(campaign.config.header_image_placement || 'top');
          setCoverOverlayOpacity(campaign.config.cover_overlay_opacity !== undefined ? campaign.config.cover_overlay_opacity : 75);
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
      const config = {
        // type specific details
        ...(type === 'news' ? newsConfig : {}),
        ...(type === 'tour' ? { steps: tourSteps } : {}),
        ...(type === 'checklist' ? { items: checklistItems } : {}),
        // dynamic custom styling options
        font_family: fontFamily,
        bg_color: bgColor || undefined,
        bg_gradient_end: bgGradientEnd || undefined,
        text_color: textColor || undefined,
        title_color: titleColor || undefined,
        title_font_size: titleFontSize,
        body_font_size: bodyFontSize,
        button_bg_color: buttonBgColor || undefined,
        button_text_color: buttonTextColor || undefined,
        button_border_radius: buttonBorderRadius,
        layout_variant: layoutVariant,
        header_image: headerImage || undefined,
        header_image_placement: headerImagePlacement,
        cover_overlay_opacity: coverOverlayOpacity,
        accent_color: buttonBgColor || newsConfig.accent_color || undefined,
      };
      
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

  const applyTemplate = (tpl: CampaignTemplate) => {
    setType(tpl.type);
    setName(tpl.name);
    setMessage(tpl.message);
    setCategory(tpl.category);
    
    // Set custom configs
    if (tpl.type === 'news') {
      setNewsConfig({
        cta_label: tpl.config.cta_label || 'Learn More',
        cta_url: tpl.config.cta_url || '',
        accent_color: tpl.styling.button_bg_color || '#3b82f6'
      });
    } else if (tpl.type === 'tour') {
      setTourSteps(tpl.config.steps || []);
    } else if (tpl.type === 'checklist') {
      setChecklistItems(tpl.config.items || []);
    }

    // Set styling parameters
    setFontFamily(tpl.styling.font_family);
    setBgColor(tpl.styling.bg_color);
    setBgGradientEnd(tpl.styling.bg_gradient_end || '');
    setTextColor(tpl.styling.text_color);
    setTitleColor(tpl.styling.title_color);
    setTitleFontSize(tpl.styling.title_font_size || 14);
    setBodyFontSize(tpl.styling.body_font_size || 12);
    setButtonBgColor(tpl.styling.button_bg_color || '');
    setButtonTextColor(tpl.styling.button_text_color || '');
    setButtonBorderRadius(tpl.styling.button_border_radius);
    setLayoutVariant(tpl.styling.layout_variant);
    setHeaderImage(tpl.styling.header_image || '');
    setHeaderImagePlacement(tpl.styling.header_image_placement || 'top');
    setCoverOverlayOpacity(tpl.styling.cover_overlay_opacity !== undefined ? tpl.styling.cover_overlay_opacity : 75);

    toast("Loaded Template", `Applied template: "${tpl.name}"`, "success");
    setActiveEditorTab('content');
  };

  const applyPreset = (preset: typeof STYLE_PRESETS[0]) => {
    setBgColor(preset.bg);
    setBgGradientEnd(preset.bgEnd || '');
    setTextColor(preset.text);
    setTitleColor(preset.title);
    setButtonBgColor(preset.buttonBg);
    setButtonTextColor(preset.buttonText);
    setLayoutVariant(preset.layout as any);
    toast("Applied Preset", `Custom styles updated to "${preset.name}"`, "success");
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
        {/* Left Panel: Canva-like Tabbed Interface */}
        <div className="flex-1 overflow-y-auto border-r flex flex-col bg-card/25 no-scrollbar">
          {/* Tab Selection Row */}
          <div className="flex border-b bg-card shrink-0 px-8 py-2 gap-2">
            {[
              { id: 'templates', label: 'Templates', icon: Palette },
              { id: 'content', label: 'Content', icon: FileText },
              { id: 'design', label: 'Design', icon: Type }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveEditorTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activeEditorTab === tab.id 
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
            <div className="max-w-2xl mx-auto">
              
              {/* ==================== TEMPLATES TAB ==================== */}
              {activeEditorTab === 'templates' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Select a Template</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose from pre-designed templates. Applying a template will instantly update the layout and style.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-muted/60 border rounded-2xl w-fit">
                    {[
                      { id: 'all', label: '✨ Show All' },
                      { id: 'banner', label: '📢 Banners' },
                      { id: 'news', label: '📰 News Updates' },
                      { id: 'tour', label: '🧭 Tours' },
                      { id: 'checklist', label: '✅ Checklists' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setTemplateFilter(f.id as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                          templateFilter === f.id
                            ? "bg-background text-foreground shadow-sm border border-border/40"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {TEMPLATES.filter(tpl => templateFilter === 'all' || tpl.type === templateFilter).map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl)}
                        className="p-5 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-2xl">{tpl.previewThumb}</span>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-accent text-muted-foreground border border-border/20"
                          )}>
                            {tpl.type}
                          </span>
                        </div>
                        <div className="mt-4">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{tpl.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{tpl.message}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-primary mt-2 flex items-center gap-1">
                            Use Template →
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================== CONTENT TAB ==================== */}
              {activeEditorTab === 'content' && (
                <div className="space-y-8 animate-fadeIn">
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
              )}

              {/* ==================== DESIGN TAB ==================== */}
              {activeEditorTab === 'design' && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Style Presets */}
                  <section className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Style Presets</label>
                    <div className="grid grid-cols-3 gap-2">
                      {STYLE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => applyPreset(preset)}
                          className="flex flex-col items-start gap-1 p-3 bg-card border border-border rounded-xl text-left hover:border-primary/40 hover:shadow-sm transition-all"
                        >
                          <span className="text-[10px] font-bold text-foreground">{preset.name}</span>
                          <div className="flex gap-1 mt-1">
                            <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: preset.bg }} />
                            <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: preset.buttonBg }} />
                            <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: preset.text }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Layout Variant */}
                  <section className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Layout Variant</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'default', label: 'Solid Block' },
                        { id: 'gradient', label: 'Linear Gradient' },
                        { id: 'glass', label: 'Glassmorphism' },
                        { id: 'minimal', label: 'Minimalist Text' }
                      ].map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setLayoutVariant(variant.id as any)}
                          className={cn(
                            "px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center",
                            layoutVariant === variant.id 
                              ? "bg-primary/10 border-primary text-primary" 
                              : "bg-card border-border text-muted-foreground hover:border-muted-foreground/30"
                          )}
                        >
                          {variant.label}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Typography Selection */}
                  <section className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Typography Font</label>
                    <div className="grid grid-cols-5 gap-2">
                      {FONTS.map((font) => (
                        <button
                          key={font}
                          onClick={() => setFontFamily(font)}
                          className={cn(
                            "px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center",
                            fontFamily === font 
                              ? "bg-primary/10 border-primary text-primary" 
                              : "bg-card border-border text-muted-foreground hover:border-muted-foreground/30"
                          )}
                          style={{ fontFamily: `'${font}', sans-serif` }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Font Sizes */}
                  <section className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Font Sizes</label>
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-2xl bg-card/50">
                      {/* Title Font Size */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-muted-foreground">Title Size</span>
                          <span className="text-[10px] font-mono font-bold bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">{titleFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="11"
                          max="24"
                          value={titleFontSize}
                          onChange={(e) => setTitleFontSize(parseInt(e.target.value))}
                          className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                        />
                      </div>

                      {/* Body Font Size */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-muted-foreground">Body Size</span>
                          <span className="text-[10px] font-mono font-bold bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">{bodyFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="9"
                          max="18"
                          value={bodyFontSize}
                          onChange={(e) => setBodyFontSize(parseInt(e.target.value))}
                          className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Colors */}
                  <section className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Color Palette</label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* BG Color */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground">Background Color</span>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={bgColor || '#1f1f23'} 
                            onChange={(e) => setBgColor(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-card p-1"
                          />
                          <input 
                            type="text" 
                            value={bgColor} 
                            placeholder="Default color"
                            onChange={(e) => setBgColor(e.target.value)}
                            className="flex-1 px-3 py-2 bg-card border rounded-lg text-xs font-mono uppercase"
                          />
                        </div>
                      </div>

                      {/* Second color (For Gradient Layout) */}
                      {layoutVariant === 'gradient' && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground">Gradient End Color</span>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={bgGradientEnd || '#8b5cf6'} 
                              onChange={(e) => setBgGradientEnd(e.target.value)}
                              className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-card p-1"
                            />
                            <input 
                              type="text" 
                              value={bgGradientEnd} 
                              placeholder="#8b5cf6"
                              onChange={(e) => setBgGradientEnd(e.target.value)}
                              className="flex-1 px-3 py-2 bg-card border rounded-lg text-xs font-mono uppercase"
                            />
                          </div>
                        </div>
                      )}

                      {/* Text color */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground">Body Text Color</span>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={textColor || '#ffffff'} 
                            onChange={(e) => setTextColor(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-card p-1"
                          />
                          <input 
                            type="text" 
                            value={textColor} 
                            placeholder="Default body"
                            onChange={(e) => setTextColor(e.target.value)}
                            className="flex-1 px-3 py-2 bg-card border rounded-lg text-xs font-mono uppercase"
                          />
                        </div>
                      </div>

                      {/* Title text color */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground">Title Color</span>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={titleColor || '#ffffff'} 
                            onChange={(e) => setTitleColor(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-card p-1"
                          />
                          <input 
                            type="text" 
                            value={titleColor} 
                            placeholder="Default title"
                            onChange={(e) => setTitleColor(e.target.value)}
                            className="flex-1 px-3 py-2 bg-card border rounded-lg text-xs font-mono uppercase"
                          />
                        </div>
                      </div>

                      {/* Button BG Color */}
                      {layoutVariant !== 'minimal' && (
                        <>
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-muted-foreground">Button Accent Color</span>
                            <div className="flex gap-2">
                              <input 
                                type="color" 
                                value={buttonBgColor || '#3b82f6'} 
                                onChange={(e) => setButtonBgColor(e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-card p-1"
                              />
                              <input 
                                type="text" 
                                value={buttonBgColor} 
                                placeholder="Default button"
                                onChange={(e) => setButtonBgColor(e.target.value)}
                                className="flex-1 px-3 py-2 bg-card border rounded-lg text-xs font-mono uppercase"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-muted-foreground">Button Text Color</span>
                            <div className="flex gap-2">
                              <input 
                                type="color" 
                                value={buttonTextColor || '#ffffff'} 
                                onChange={(e) => setButtonTextColor(e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-card p-1"
                              />
                              <input 
                                type="text" 
                                value={buttonTextColor} 
                                placeholder="#ffffff"
                                onChange={(e) => setButtonTextColor(e.target.value)}
                                className="flex-1 px-3 py-2 bg-card border rounded-lg text-xs font-mono uppercase"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  {/* Corner styles */}
                  {layoutVariant !== 'minimal' && (
                    <section className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Button Corner Radius</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'rounded-none', label: 'Square' },
                          { id: 'rounded-lg', label: 'Medium' },
                          { id: 'rounded-xl', label: 'Soft' },
                          { id: 'rounded-full', label: 'Pill' }
                        ].map((radius) => (
                          <button
                            key={radius.id}
                            onClick={() => setButtonBorderRadius(radius.id as any)}
                            className={cn(
                              "px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center",
                              buttonBorderRadius === radius.id 
                                ? "bg-primary/10 border-primary text-primary" 
                                : "bg-card border-border text-muted-foreground hover:border-muted-foreground/30"
                            )}
                          >
                            {radius.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Header Image Layout Options */}
                  {(type === 'news' || type === 'tour') && (
                    <section className="space-y-4 pt-4 border-t">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Header Media Design</label>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground">Image Media URL</span>
                          <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input 
                              type="text" 
                              placeholder="https://images.unsplash.com/..." 
                              value={headerImage}
                              onChange={(e) => setHeaderImage(e.target.value)}
                              className="w-full bg-card border rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-primary/20"
                            />
                          </div>
                        </div>

                        {headerImage && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-muted-foreground">Placement Layout</span>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => setHeaderImagePlacement('top')}
                                className={cn(
                                  "px-4 py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5",
                                  headerImagePlacement === 'top' ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                                )}
                              >
                                <span>Banner style</span>
                                <span className="text-[9px] text-muted-foreground font-normal">Sits at the top of the update card.</span>
                              </button>
                              <button
                                onClick={() => setHeaderImagePlacement('cover')}
                                className={cn(
                                  "px-4 py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5",
                                  headerImagePlacement === 'cover' ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                                )}
                              >
                                <span>Backdrop cover</span>
                                <span className="text-[9px] text-muted-foreground font-normal">Fills full background with layout overlay.</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {headerImage && headerImagePlacement === 'cover' && (
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-muted-foreground">Image Overlay Veil Opacity</span>
                              <span className="text-[10px] font-mono font-bold bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">{coverOverlayOpacity}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={coverOverlayOpacity}
                              onChange={(e) => setCoverOverlayOpacity(parseInt(e.target.value))}
                              className="w-full accent-primary bg-muted rounded-lg h-1.5 cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Premium Customizer Preview Simulator */}
        <div className="w-[450px] border-l bg-accent/20 flex flex-col p-8 overflow-hidden shrink-0">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Widget Preview</span>
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

          {/* Simulated Mobile Mockup screen */}
          <div className="flex-1 flex flex-col items-center justify-center relative scale-[0.9] origin-center">
            <div className={cn(
              "w-[340px] h-[600px] rounded-[3rem] border-8 border-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.25)] overflow-hidden relative",
              previewTheme === 'dark' ? "bg-[#131316]" : "bg-slate-50"
            )}>
              {/* Phone Status Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-zinc-950 rounded-b-2xl z-20" />
              
              {/* Dynamic Mock widget screen content */}
              <div className="h-full flex flex-col pt-8">
                {/* Mock Header banner */}
                <div 
                  className="p-5 pb-6 text-white shrink-0"
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

                {/* Simulated Content items list */}
                <div className="flex-1 p-4 space-y-5 overflow-y-auto no-scrollbar">
                  <div className="space-y-2 opacity-20">
                    <div className="w-1/2 h-2 bg-muted-foreground/30 rounded-full" />
                    <div className="w-full h-12 bg-muted-foreground/10 rounded-2xl border border-muted-foreground/10" />
                  </div>

                  {/* Dynamic Render of updated Styled widgets in preview */}
                  <div className="relative z-10 space-y-4">
                    
                    {type === 'banner' && (
                      <div 
                        style={{
                          backgroundColor: bgColor || 'rgba(59, 130, 246, 0.1)',
                          borderColor: bgColor ? `${bgColor}33` : 'rgba(59, 130, 246, 0.2)',
                          color: textColor || '#3b82f6',
                          fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
                          fontSize: `${bodyFontSize}px`,
                        }}
                        className="border p-3 flex items-center gap-3 rounded-xl transition-all"
                      >
                        <Megaphone className="w-4 h-4 shrink-0" style={{ color: textColor || '#3b82f6' }} />
                        <p className="text-[11px] font-medium leading-tight" style={{ fontSize: `${bodyFontSize}px` }}>{message || 'Banner message preview...'}</p>
                      </div>
                    )}

                    {type === 'news' && (
                      <WidgetNewsCard
                        id="preview"
                        name={name || 'News Title'}
                        message={message || 'News content preview...'}
                        config={{
                          ...newsConfig,
                          font_family: fontFamily,
                          bg_color: bgColor || undefined,
                          bg_gradient_end: bgGradientEnd || undefined,
                          text_color: textColor || undefined,
                          title_color: titleColor || undefined,
                          title_font_size: titleFontSize,
                          body_font_size: bodyFontSize,
                          button_bg_color: buttonBgColor || undefined,
                          button_text_color: buttonTextColor || undefined,
                          button_border_radius: buttonBorderRadius,
                          layout_variant: layoutVariant,
                          header_image: headerImage || undefined,
                          header_image_placement: headerImagePlacement,
                          cover_overlay_opacity: coverOverlayOpacity,
                        }}
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
                        config={{
                          items: checklistItems,
                          font_family: fontFamily,
                          bg_color: bgColor || undefined,
                          bg_gradient_end: bgGradientEnd || undefined,
                          text_color: textColor || undefined,
                          title_color: titleColor || undefined,
                          title_font_size: titleFontSize,
                          body_font_size: bodyFontSize,
                          accent_color: buttonBgColor || undefined,
                          layout_variant: layoutVariant as any,
                        }}
                        theme={previewTheme}
                        primaryColor="#3b82f6"
                      />
                    )}
                  </div>

                  <div className="space-y-2 opacity-20">
                    <div className="w-1/3 h-2 bg-muted-foreground/30 rounded-full" />
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="w-full h-10 bg-muted-foreground/5 rounded-xl border border-muted-foreground/5" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tour Overlay Preview */}
                <AnimatePresence>
                  {type === 'tour' && (
                    <div className="absolute inset-0 z-50">
                      <WidgetTourOverlay
                        id="preview"
                        name={name || 'Tour'}
                        config={{
                          steps: tourSteps,
                          font_family: fontFamily,
                          bg_color: bgColor || undefined,
                          bg_gradient_end: bgGradientEnd || undefined,
                          text_color: textColor || undefined,
                          title_color: titleColor || undefined,
                          title_font_size: titleFontSize,
                          body_font_size: bodyFontSize,
                          accent_color: buttonBgColor || undefined,
                          layout_variant: layoutVariant as any,
                          button_border_radius: buttonBorderRadius,
                        }}
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
            
            <div className="mt-8 flex items-center gap-2 text-muted-foreground opacity-50 shrink-0">
              <Smartphone className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Simulator Live Screen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
