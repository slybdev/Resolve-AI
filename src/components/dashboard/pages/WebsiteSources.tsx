import React, { useState } from 'react';
import { Globe, Plus, Search, RefreshCw, MoreVertical, X, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface CrawledPage {
  id: string;
  url: string;
  status: 'indexed' | 'indexing' | 'error';
  lastCrawled: string;
}

const initialPages: CrawledPage[] = [
  {
    id: '1',
    url: 'https://docs.stark.com/faq',
    status: 'indexed',
    lastCrawled: '2h ago'
  },
  {
    id: '2',
    url: 'https://docs.stark.com/pricing',
    status: 'indexed',
    lastCrawled: '1d ago'
  },
  {
    id: '3',
    url: 'https://docs.stark.com/support',
    status: 'indexing',
    lastCrawled: 'Just now'
  }
];

export const WebsiteSources = () => {
  const [pages, setPages] = useState(initialPages);
  const [url, setUrl] = useState('');

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Website Sources</h1>
          <p className="text-muted-foreground">Crawl and index website content for AI training.</p>
        </div>

        {/* URL Input Area */}
        <div className="bg-card border border-border p-8 rounded-3xl space-y-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Website URL</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/docs" 
                  className="w-full pl-12 pr-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Source
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Crawl Depth</label>
              <select className="w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                <option value="1">1 Level</option>
                <option value="2">2 Levels</option>
                <option value="3">3 Levels</option>
                <option value="max">Maximum</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recrawling</label>
              <select className="w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Exclude URLs</label>
              <input 
                type="text" 
                placeholder="/admin/*, /login/*" 
                className="w-full px-4 py-3 bg-accent/50 border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Crawled Pages List */}
        <div className="grid gap-4">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Crawled Pages</h4>
            <span className="text-[10px] text-muted-foreground">{pages.length} Pages Total</span>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">URL</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Crawled</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="border-b border-border hover:bg-accent transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground truncate max-w-md">{page.url}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        page.status === 'indexed' ? "bg-green-500/10 text-green-500 border border-green-500/20" : 
                        page.status === 'indexing' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : 
                        "bg-red-500/10 text-red-500 border border-red-500/20"
                      )}>
                        {page.status === 'indexing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {page.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{page.lastCrawled}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors btn-press">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors btn-press">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
