import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  FileText, 
  Settings, 
  ExternalLink, 
  ChevronRight, 
  Eye, 
  Clock, 
  MoreVertical,
  Globe,
  Layout,
  Zap,
  BookOpen,
  Folder,
  BarChart3,
  CheckCircle2,
  Edit3,
  Share2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

const TabButton = ({ active, label, onClick, icon: Icon }: { active: boolean; label: string; onClick: () => void; icon: any }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all relative",
      active ? "text-white" : "text-muted-foreground hover:text-white"
    )}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
    {active && (
      <motion.div
        layoutId="hc-tab-active"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
      />
    )}
  </button>
);

const ArticleCard = ({ title, category, author, status, views, lastUpdated }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="group flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer"
  >
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
        <FileText className="w-6 h-6 text-muted-foreground group-hover:text-white" />
      </div>
      <div>
        <h4 className="text-sm font-black text-white mb-1 group-hover:text-primary transition-colors">{title}</h4>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><Folder className="w-3 h-3" /> {category}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {lastUpdated}</span>
          <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> {views} views</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <span className={cn(
        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
        status === 'Published' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
      )}>
        {status}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
          <Edit3 className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  </motion.div>
);

const StatCard = ({ label, value, change, icon: Icon }: any) => (
  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon className="w-12 h-12" />
    </div>
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">{change}</span>
    </div>
    <div className="text-2xl font-black text-white mb-1">{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{label}</div>
  </div>
);

export const HelpCenter = () => {
  const [activeTab, setActiveTab] = useState('articles');

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden">
      {/* Header */}
      <div className="p-10 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <BookOpen className="text-black w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Knowledge Base</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Public Help Center</h1>
            <p className="text-muted-foreground text-sm font-medium">Empower your customers with a world-class self-service portal.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10">
              <Globe className="w-4 h-4" />
              View Portal
            </button>
            <button className="flex items-center gap-2 px-8 py-3 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all shadow-2xl shadow-white/10">
              <Plus className="w-4 h-4" />
              New Article
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <TabButton active={activeTab === 'articles'} label="Articles" onClick={() => setActiveTab('articles')} icon={FileText} />
          <TabButton active={activeTab === 'collections'} label="Collections" onClick={() => setActiveTab('collections')} icon={Folder} />
          <TabButton active={activeTab === 'analytics'} label="Analytics" onClick={() => setActiveTab('analytics')} icon={BarChart3} />
          <TabButton active={activeTab === 'settings'} label="Portal Settings" onClick={() => setActiveTab('settings')} icon={Settings} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
        {activeTab === 'articles' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Total Views" value="45.2k" change="+12%" icon={Eye} />
              <StatCard label="Avg. Rating" value="4.8/5" change="+2%" icon={CheckCircle2} />
              <StatCard label="Deflection Rate" value="32%" change="+5%" icon={Zap} />
            </div>

            <div className="flex items-center justify-between gap-6">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search articles by title, content or tags..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="flex items-center gap-3">
                <select className="bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3.5 text-xs font-bold text-white focus:outline-none cursor-pointer hover:bg-white/[0.05] transition-all">
                  <option>All Status</option>
                  <option>Published</option>
                  <option>Draft</option>
                </select>
                <button className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-muted-foreground hover:text-white transition-all">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <ArticleCard title="Getting Started with Stark" category="Basics" author="Silas" status="Published" views="1.2k" lastUpdated="2 days ago" />
              <ArticleCard title="Setting up your first AI Agent" category="AI Agent" author="Silas" status="Published" views="850" lastUpdated="5 days ago" />
              <ArticleCard title="Connecting your WhatsApp Business account" category="Channels" author="Silas" status="Draft" views="0" lastUpdated="1 hour ago" />
              <ArticleCard title="Advanced Workflow Automation" category="Automation" author="Silas" status="Published" views="420" lastUpdated="1 week ago" />
              <ArticleCard title="Managing Team Permissions" category="Security" author="Silas" status="Published" views="210" lastUpdated="3 days ago" />
            </div>
          </>
        )}

        {activeTab === 'collections' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Basics', articles: 12, icon: BookOpen, color: 'text-blue-500', desc: 'Core concepts and platform introduction.' },
              { name: 'AI Agent', articles: 8, icon: Zap, color: 'text-purple-500', desc: 'Training, configuration and optimization.' },
              { name: 'Channels', articles: 15, icon: Globe, color: 'text-emerald-500', desc: 'Integrating messaging platforms.' },
              { name: 'Billing', articles: 5, icon: Layout, color: 'text-amber-500', desc: 'Invoices, plans and payment methods.' },
              { name: 'Security', articles: 7, icon: Settings, color: 'text-red-500', desc: 'Privacy, data and access control.' },
            ].map((collection) => (
              <motion.div 
                key={collection.name}
                whileHover={{ y: -8, scale: 1.02 }}
                className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer group"
              >
                <div className={cn("w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl", collection.color)}>
                  <collection.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">{collection.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{collection.desc}</p>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{collection.articles} articles</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-2 transition-transform" />
                </div>
              </motion.div>
            ))}
            <button className="p-8 rounded-[2.5rem] border-2 border-dashed border-white/5 hover:border-white/20 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-white group min-h-[280px]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest">New Collection</span>
            </button>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-white mb-2">Analytics Dashboard</h3>
              <p className="text-muted-foreground text-sm max-w-md">Detailed insights into article performance and customer search behavior are being processed.</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-12">
            <section className="space-y-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <Globe className="w-6 h-6 text-primary" />
                General Portal Settings
              </h3>
              <div className="grid gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Portal Name</label>
                  <input type="text" defaultValue="Stark Help Center" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Custom Domain</label>
                  <div className="flex gap-3">
                    <input type="text" defaultValue="help.stark-ai.com" className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10" />
                    <button className="px-8 py-4 bg-white/5 text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all">Verify</button>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <Layout className="w-6 h-6 text-primary" />
                Appearance & Branding
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-white block mb-1">Primary Brand Color</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Used for buttons and links</span>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-2xl border-4 border-white/10 shadow-2xl" />
                </div>
                <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-white block mb-1">Dark Mode</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Default portal theme</span>
                  </div>
                  <div className="w-12 h-6 bg-white rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-6">
              <button className="px-10 py-4 bg-white text-black rounded-full text-xs font-black uppercase tracking-widest shadow-2xl shadow-white/10 hover:bg-white/90 transition-all">
                Save Portal Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
