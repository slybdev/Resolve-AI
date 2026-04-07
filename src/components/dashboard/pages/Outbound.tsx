import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/ui/Toast';
import { Spinner } from '@/src/components/ui/ios-spinner';
import { 
  Megaphone, Plus, Search, Filter, MoreHorizontal, 
  Layout, MessageSquare, Zap, Eye, MousePointer2,
  Clock, CheckCircle2, AlertCircle, Settings,
  ArrowRight, ExternalLink, BarChart3, Globe, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface Campaign {
  id: string;
  name: string;
  type: 'banner' | 'news' | 'tour' | 'checklist';
  status: 'active' | 'paused' | 'draft';
  reach: string;
  ctr: string;
  lastUpdated: string;
}

// mockCampaigns removed, using real data from API

export const Outbound = ({ workspaceId }: { workspaceId: string }) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'analytics'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', type: 'news' as const });
  const { toast } = useToast();

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.automations.campaigns.list(workspaceId);
      
      const mapped: Campaign[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: 'news', // Defaulting for now
        status: c.status === 'running' ? 'active' : c.status === 'scheduled' ? 'paused' : 'active',
        reach: (c.sent_count || 0).toLocaleString(),
        ctr: '0%', // Placeholder
        lastUpdated: new Date(c.created_at).toLocaleDateString()
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

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      toast("Validation Error", "Please provide a campaign name.", "error");
      return;
    }

    try {
      await api.automations.campaigns.create(workspaceId, {
        name: newCampaign.name,
        status: 'scheduled',
        audience_filters: {}
      });
      toast("Campaign Created", "Your campaign has been scheduled.", "success");
      setIsModalOpen(false);
      setNewCampaign({ name: '', type: 'news' });
      fetchCampaigns();
    } catch (error: any) {
      toast("Error", "Failed to create campaign: " + error.message, "error");
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden gap-2 p-2">
      {/* Header */}
      <div className="p-6 border border-border flex items-center justify-between bg-card rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Outbound
          </h1>
          <p className="text-sm text-muted-foreground">Proactively engage your customers with banners, news, and tours.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-accent/50 text-foreground rounded-xl text-sm font-bold hover:bg-accent transition-all border border-border">
            <Globe className="w-4 h-4" />
            Preview on Site
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border border-border bg-card flex items-center justify-between rounded-2xl shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          {[
            { id: 'campaigns', label: 'Campaigns', icon: Layout },
            { id: 'templates', label: 'Templates', icon: Settings },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all",
                activeTab === tab.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Campaign Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Banners', icon: Layout, desc: 'Announcements at the top of the page.' },
                { label: 'News', icon: Megaphone, desc: 'In-app messages and updates.' },
                { label: 'Tours', icon: MousePointer2, desc: 'Guided walkthroughs of features.' },
                { label: 'Checklists', icon: CheckCircle2, desc: 'Onboarding tasks for users.' },
              ].map((type) => (
                <div key={type.label} className="bg-card border border-border p-4 rounded-2xl hover:border-primary/50 transition-all cursor-pointer group shadow-sm">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                    <type.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{type.label}</h3>
                  <p className="text-[10px] text-muted-foreground">{type.desc}</p>
                </div>
              ))}
            </div>

            {/* Campaigns Table */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-accent/30 border-b border-border">
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campaign</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reach</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CTR</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <Spinner size="lg" />
                          <span className="text-xs font-medium text-muted-foreground">Loading campaigns...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-accent/10 transition-colors group">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{campaign.name}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                              <Clock className="w-3 h-3" /> Updated {campaign.lastUpdated}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground capitalize">{campaign.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            campaign.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : 
                            campaign.status === 'draft' ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"
                          )}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-foreground">{campaign.reach}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-foreground">{campaign.ctr}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-accent rounded-lg transition-all">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Welcome Banner', type: 'Banner' },
              { title: 'Product Update', type: 'News' },
              { title: 'Feature Tour', type: 'Tour' },
              { title: 'Setup Guide', type: 'Checklist' },
            ].map((template) => (
              <div key={template.title} className="bg-card border border-border rounded-3xl overflow-hidden group hover:border-primary/50 transition-all shadow-sm">
                <div className="aspect-video bg-accent/50 flex items-center justify-center p-8">
                  <div className="w-full h-full border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground">
                    Preview
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{template.title}</h3>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{template.type}</span>
                  </div>
                  <button className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Reach', value: '124.5k', icon: Eye },
                { label: 'Avg. CTR', value: '12.4%', icon: MousePointer2 },
                { label: 'Conversions', value: '1,240', icon: Zap },
                { label: 'Active Campaigns', icon: Megaphone, value: '12' },
              ].map((stat, i) => (
                <div key={i} className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                  <stat.icon className="w-5 h-5 text-primary mb-4" />
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-3xl p-8 h-[300px] flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
              <BarChart3 className="w-12 h-12 text-muted-foreground opacity-20" />
              <div>
                <h3 className="text-lg font-bold text-foreground">Campaign Performance Over Time</h3>
                <p className="text-sm text-muted-foreground">Detailed analytics will appear here as your campaigns gather data.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-accent/50">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Create New Campaign</h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Campaign Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Summer Sale Announcement"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Campaign Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['banner', 'news', 'tour', 'checklist'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewCampaign({ ...newCampaign, type: type as any })}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-xs font-bold capitalize transition-all",
                          newCampaign.type === type 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "bg-accent/30 border-border text-muted-foreground hover:border-primary/20"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border flex items-center justify-end gap-3 bg-accent/50">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateCampaign}
                  className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20"
                >
                  Create Campaign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
