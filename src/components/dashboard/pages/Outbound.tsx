import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { 
  Megaphone, Plus, Search, Filter,
  Layout, MousePointer2, Eye,
  Clock, CheckCircle2, BarChart3, Globe, X,
  Trash2, Pause, Play, Copy, Newspaper, Map, CheckSquare,
  ArrowRight, Zap, PanelRightOpen, PanelRightClose
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface Campaign {
  id: string;
  name: string;
  type: 'banner' | 'news' | 'tour' | 'checklist';
  status: 'running' | 'paused' | 'draft' | 'scheduled';
  reach: number;
  ctr: string;
  lastUpdated: string;
  category?: string;
  message?: string;
  config?: any;
  creator_name?: string;
}

type FilterType = 'all' | 'banner' | 'news' | 'tour' | 'checklist';

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string; desc: string }> = {
  banner: { label: 'Banners', icon: Layout, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Announcements at the top of the widget.' },
  news: { label: 'News', icon: Newspaper, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'In-app messages and updates.' },
  tour: { label: 'Tours', icon: Map, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Guided walkthroughs of features.' },
  checklist: { label: 'Checklists', icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Onboarding tasks for users.' },
};

export const Outbound = ({ workspaceId, onSelectCampaign }: { workspaceId: string, onSelectCampaign: (id: string | null) => void }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.automations.campaigns.list(workspaceId);
      const mapped: Campaign[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type || 'news',
        status: c.status || 'draft',
        reach: c.sent_count || 0,
        ctr: c.sent_count > 0 ? `${((c.opened_count || 0) / c.sent_count * 100).toFixed(1)}%` : '0%',
        lastUpdated: new Date(c.updated_at || c.created_at).toLocaleDateString(),
        category: c.category,
        message: c.message,
        config: c.config,
        creator_name: c.creator_name,
      }));
      setCampaigns(mapped);
    } catch (error: any) {
      toast("Error", "Failed to fetch campaigns: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, toast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesType = activeFilter === 'all' || c.type === activeFilter;
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (c.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [campaigns, activeFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const source = activeFilter === 'all' ? campaigns : campaigns.filter(c => c.type === activeFilter);
    const active = source.filter(c => c.status === 'running');
    const totalReach = source.reduce((acc, c) => acc + c.reach, 0);
    return {
      total: source.length,
      active: active.length,
      reach: totalReach,
      drafts: source.filter(c => c.status === 'draft').length,
    };
  }, [campaigns, activeFilter]);

  // Handlers
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'running' ? 'paused' : 'running';
    try {
      await api.automations.campaigns.update(id, { status: newStatus });
      toast("Updated", `Campaign ${newStatus === 'running' ? 'activated' : 'paused'}.`, "success");
      fetchCampaigns();
    } catch (error: any) {
      toast("Error", "Failed to update: " + error.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await api.automations.campaigns.delete(id);
      toast("Deleted", "Campaign removed.", "success");
      fetchCampaigns();
    } catch (error: any) {
      toast("Error", "Failed to delete: " + error.message, "error");
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      await api.automations.campaigns.create(workspaceId, {
        name: `${campaign.name} (Copy)`,
        type: campaign.type,
        status: 'draft',
        message: campaign.message || '',
        config: campaign.config || {},
        category: campaign.category || '',
        channel: 'widget',
        audience_filters: {},
      });
      toast("Duplicated", `"${campaign.name}" cloned as draft.`, "success");
      fetchCampaigns();
    } catch (error: any) {
      toast("Error", "Failed to duplicate: " + error.message, "error");
    }
  };

  // Filter tabs with counts
  const filterTabs: { id: FilterType; label: string; icon: any }[] = [
    { id: 'all', label: 'All', icon: Megaphone },
    { id: 'banner', label: 'Banners', icon: Layout },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'tour', label: 'Tours', icon: Map },
    { id: 'checklist', label: 'Checklists', icon: CheckSquare },
  ];

  const getTypeCount = (type: FilterType) => 
    type === 'all' ? campaigns.length : campaigns.filter(c => c.type === type).length;

  // Preview panel items
  const previewItems = campaigns.filter(c => 
    (c.status === 'running') && 
    (activeFilter === 'all' || c.type === activeFilter)
  );

  return (
    <div className="h-full flex bg-transparent overflow-hidden gap-2 p-2">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 gap-2">
        {/* Header */}
        <div className="p-5 border border-border flex items-center justify-between bg-card rounded-2xl shadow-sm shrink-0">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              Outbound
            </h1>
            <p className="text-xs text-muted-foreground mt-1 ml-[46px]">Proactively engage customers with banners, news, tours & checklists.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 bg-accent/50 text-foreground rounded-xl text-xs font-bold hover:bg-accent transition-all border border-border"
            >
              {showPreview ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button 
              onClick={() => onSelectCampaign(null)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 shrink-0">
          {[
            { label: 'Total', value: stats.total, icon: Megaphone, color: 'text-foreground' },
            { label: 'Active', value: stats.active, icon: Zap, color: 'text-emerald-500' },
            { label: 'Reach', value: stats.reach.toLocaleString(), icon: Eye, color: 'text-blue-500' },
            { label: 'Drafts', value: stats.drafts, icon: Clock, color: 'text-orange-500' },
          ].map((stat, i) => (
            <div key={i} className="p-4 bg-card border border-border rounded-2xl shadow-sm flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-accent/50 shrink-0")}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs + Search */}
        <div className="flex items-center justify-between bg-card border border-border p-1.5 rounded-2xl shadow-sm shrink-0">
          <div className="flex items-center gap-1">
            {filterTabs.map((tab) => {
              const count = getTypeCount(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                    activeFilter === tab.id 
                      ? "bg-foreground text-background shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                      activeFilter === tab.id 
                        ? "bg-background/20 text-background" 
                        : "bg-accent text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pr-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search campaigns..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-accent/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 w-56"
              />
            </div>
          </div>
        </div>

        {/* Campaign Table / Empty State */}
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Spinner size="lg" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Loading campaigns...</span>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            /* Smart Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="max-w-lg w-full text-center space-y-6">
                <div className="inline-flex p-4 bg-accent/50 rounded-3xl">
                  <Megaphone className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {activeFilter === 'all' ? 'No campaigns yet' : `No ${TYPE_META[activeFilter]?.label.toLowerCase()} campaigns`}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first campaign to start engaging customers proactively.
                  </p>
                </div>
                
                {/* Quick-create type cards */}
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {Object.entries(TYPE_META).map(([typeId, meta]) => (
                    <button
                      key={typeId}
                      onClick={() => onSelectCampaign(null)}
                      className="flex flex-col items-center gap-2.5 p-5 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all group"
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", meta.bg)}>
                        <meta.icon className={cn("w-5 h-5", meta.color)} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{meta.label}</p>
                        <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{meta.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Campaign Table */
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-accent/30 border-b border-border">
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campaign</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reach</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CTR</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCampaigns.map((campaign, i) => {
                    const meta = TYPE_META[campaign.type] || TYPE_META.news;
                    return (
                      <motion.tr
                        key={campaign.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-accent/10 transition-colors group"
                      >
                        <td 
                          className="px-5 py-4 cursor-pointer"
                          onClick={() => onSelectCampaign(campaign.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
                              <meta.icon className={cn("w-4 h-4", meta.color)} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{campaign.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">Updated {campaign.lastUpdated}</span>
                                {campaign.creator_name && (
                                  <>
                                    <span className="text-[10px] text-muted-foreground">•</span>
                                    <span className="text-[10px] text-muted-foreground">{campaign.creator_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", meta.bg, meta.color)}>
                            <meta.icon className="w-3 h-3" />
                            {meta.label.replace(/s$/, '')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(campaign.id, campaign.status); }}
                            className="flex items-center gap-2 group/toggle"
                          >
                            <div className={cn(
                              "w-8 h-[18px] rounded-full p-[2px] transition-colors cursor-pointer",
                              campaign.status === 'running' ? "bg-emerald-500" : "bg-muted"
                            )}>
                              <motion.div 
                                animate={{ x: campaign.status === 'running' ? 14 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="w-[14px] h-[14px] bg-white rounded-full shadow-sm" 
                              />
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              campaign.status === 'running' ? "text-emerald-500" : 
                              campaign.status === 'draft' ? "text-orange-500" :
                              campaign.status === 'scheduled' ? "text-blue-500" : "text-muted-foreground"
                            )}>
                              {campaign.status === 'running' ? 'Active' : campaign.status}
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium text-foreground tabular-nums">{campaign.reach.toLocaleString()}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium text-foreground tabular-nums">{campaign.ctr}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(campaign); }}
                              className="p-2 hover:bg-accent rounded-lg transition-all text-muted-foreground hover:text-foreground"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id); }}
                              className="p-2 hover:bg-destructive/10 rounded-lg transition-all text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="shrink-0 border border-border bg-card rounded-2xl overflow-hidden flex flex-col shadow-sm"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-accent/30">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Widget Preview</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-500 uppercase">Live</span>
              </div>
            </div>

            <div className="flex-1 flex items-end justify-center p-4 overflow-hidden">
              <div className="w-full max-w-[280px] h-[460px] bg-card border border-border rounded-[28px] shadow-2xl overflow-hidden flex flex-col">
                {/* Mock widget header */}
                <div className="p-5 bg-primary space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <Megaphone className="w-3.5 h-3.5 text-white" />
                    </div>
                    <X className="w-3.5 h-3.5 text-white/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">What's New</h4>
                    <p className="text-[10px] text-white/70">Latest from your team.</p>
                  </div>
                </div>

                {/* Preview items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                  {previewItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 opacity-40">
                      <Eye className="w-8 h-8 mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">No active campaigns</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Publish a campaign to see it here.</p>
                    </div>
                  ) : (
                    previewItems.map(item => {
                      const meta = TYPE_META[item.type] || TYPE_META.news;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => onSelectCampaign(item.id)}
                          className="p-3 bg-accent/50 border border-border rounded-xl space-y-1.5 hover:bg-accent transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[8px] font-bold uppercase tracking-widest", meta.color)}>
                              {item.category || meta.label}
                            </span>
                            <span className="text-[8px] text-muted-foreground">{item.lastUpdated}</span>
                          </div>
                          <h5 className="text-[11px] font-bold text-foreground leading-snug group-hover:text-primary transition-colors">{item.name}</h5>
                          {item.message && (
                            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{item.message}</p>
                          )}
                          <div className="flex items-center gap-1 text-[8px] text-primary font-bold">
                            <span>View</span>
                            <ArrowRight className="w-2 h-2" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 border-t border-border bg-accent/30">
                  <button className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold hover:opacity-90 transition-all">
                    View all updates
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
