import React, { useState } from 'react';
import { 
  Megaphone, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Globe,
  Smartphone,
  Mail,
  ArrowRight,
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'framer-motion';

interface NewsItem {
  id: string;
  title: string;
  status: 'published' | 'draft' | 'scheduled';
  author: string;
  views: number;
  clicks: number;
  date: string;
  category: string;
}

const newsItems: NewsItem[] = [
  { id: '1', title: 'New Feature: AI Copilot for Agents', status: 'published', author: 'Tony Stark', views: 1240, clicks: 450, date: 'Mar 12, 2026', category: 'Product Update' },
  { id: '2', title: 'Scheduled Maintenance: March 20th', status: 'scheduled', author: 'Steve Rogers', views: 0, clicks: 0, date: 'Mar 20, 2026', category: 'Maintenance' },
  { id: '3', title: 'Stark UI Professional Refresh', status: 'published', author: 'Natasha Romanoff', views: 890, clicks: 210, date: 'Mar 10, 2026', category: 'Design' },
  { id: '4', title: 'New Integration: Slack & Microsoft Teams', status: 'draft', author: 'Bruce Banner', views: 0, clicks: 0, date: 'Mar 15, 2026', category: 'Integrations' },
];

export const News = ({ workspaceId }: { workspaceId: string }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'drafts'>('all');

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 p-8 overflow-y-auto no-scrollbar">
        <div className="max-w-6xl w-full mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">News & Updates</h1>
              <p className="text-muted-foreground">Announce new features and updates directly in the messenger.</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Create Update
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Views', value: '2.1k', icon: Eye, color: 'text-blue-500' },
              { label: 'Avg. CTR', value: '18.4%', icon: BarChart3, color: 'text-green-500' },
              { label: 'Active Updates', value: '12', icon: Megaphone, color: 'text-purple-500' },
              { label: 'Scheduled', value: '3', icon: Calendar, color: 'text-orange-500' },
            ].map((stat, i) => (
              <div key={i} className="p-6 bg-card border border-border rounded-3xl space-y-2 card-hover">
                <div className="flex items-center justify-between">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                  <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">+12%</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="flex items-center justify-between bg-card border border-border p-2 rounded-2xl">
            <div className="flex items-center gap-1">
              {['all', 'published', 'drafts'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize",
                    activeTab === tab ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pr-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search updates..." 
                  className="pl-9 pr-4 py-2 bg-accent/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 w-64"
                />
              </div>
              <button className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-all">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* News List */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Update Title</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Author</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Views</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clicks</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {newsItems.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/20 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                          <Megaphone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        item.status === 'published' ? "bg-green-500/10 text-green-500" :
                        item.status === 'scheduled' ? "bg-blue-500/10 text-blue-500" :
                        "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {item.status === 'published' && <CheckCircle2 className="w-3 h-3" />}
                        {item.status === 'scheduled' && <Clock className="w-3 h-3" />}
                        {item.status === 'draft' && <AlertCircle className="w-3 h-3" />}
                        {item.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent border border-border flex items-center justify-center text-[10px] font-bold">
                          {item.author[0]}
                        </div>
                        <span className="text-xs text-foreground">{item.author}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-foreground font-mono">{item.views.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs text-foreground font-mono">{item.clicks.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{item.date}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="w-96 border-l border-border bg-accent/30 p-8 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Messenger Preview</h3>
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Live</span>
          </div>
        </div>

        <div className="flex-1 flex items-end justify-center">
          <div className="w-full max-w-[280px] h-[480px] bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative">
            <div className="p-6 bg-primary space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-white" />
                </div>
                <X className="w-4 h-4 text-white/60" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white leading-tight">What's New</h4>
                <p className="text-xs text-white/80">Stay up to date with the latest from Stark.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {newsItems.filter(i => i.status === 'published').map(item => (
                <div key={item.id} className="p-4 bg-accent/50 border border-border rounded-2xl space-y-2 hover:bg-accent transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold text-primary uppercase tracking-widest">{item.category}</span>
                    <span className="text-[8px] text-muted-foreground">{item.date}</span>
                  </div>
                  <h5 className="text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors">{item.title}</h5>
                  <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
                    <span>Read more</span>
                    <ArrowRight className="w-2 h-2" />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border bg-accent/30">
              <button className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold hover:opacity-90 transition-all">
                View all updates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
