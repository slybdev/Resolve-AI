import React, { useState, useEffect } from 'react';
import { 
  Star, Heart, Search, Plus, Filter, MoreHorizontal, 
  BarChart3, MessageSquare, Zap, Clock, Smile, Frown,
  Meh, TrendingUp, Users, ShieldCheck, AlertCircle,
  Loader2, Bot, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { api } from '@/src/lib/api';

interface CSATSummary {
  avg_score: number | null;
  total_ratings: number;
  period_days: number;
}

interface ScoreDist {
  score: number;
  count: number;
}

interface DailyTrend {
  date: string;
  avg_score: number | null;
  count: number;
}

interface EntityStats {
  avg_score: number | null;
  count: number;
}

export const CSAT = ({ workspaceId }: { workspaceId: string }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'surveys' | 'sentiment'>('overview');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary: CSATSummary,
    score_distribution: ScoreDist[],
    daily_trend: DailyTrend[],
    entity_comparison: Record<string, EntityStats>
  } | null>(null);

  const fetchCSAT = async () => {
    setLoading(true);
    try {
      const result = await api.analytics.getCSAT(workspaceId, days);
      if (result) {
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch CSAT data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchCSAT();
    }
  }, [workspaceId, days]);

  const scoreColors = ['#ef4444', '#f97316', '#f59e0b', '#34d399', '#10b981'];

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden gap-2 p-2 relative">
      {loading && !data && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="p-6 border border-border flex items-center justify-between bg-card rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-primary" />
            CSAT & Sentiment
          </h1>
          <p className="text-sm text-muted-foreground">Monitor customer satisfaction and automated sentiment trends.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-accent/50 text-foreground rounded-xl text-sm font-bold hover:bg-accent transition-all border border-border">
            <BarChart3 className="w-4 h-4" />
            Full Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            New Survey
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border border-border bg-card flex items-center justify-between rounded-2xl shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'surveys', label: 'Surveys', icon: MessageSquare },
            { id: 'sentiment', label: 'Sentiment Analysis', icon: Heart },
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
      <div className={cn(
        "flex-1 overflow-y-auto p-8 no-scrollbar bg-card border border-border rounded-2xl shadow-sm transition-opacity duration-300",
        loading ? "opacity-60" : "opacity-100"
      )}>
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Live</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{data?.summary.avg_score || 'N/A'}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Avg. CSAT</div>
              </div>
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">{data?.summary.total_ratings || 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Feedbacks</div>
              </div>
              <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">{days} Days</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Reporting Period</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Daily Trend Chart */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    CSAT Trends
                  </h3>
                  <select 
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="bg-accent/50 border border-border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                  </select>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.daily_trend || []}>
                      <defs>
                        <linearGradient id="colorCSAT" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#888' }}
                        tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      />
                      <YAxis 
                        domain={[0, 5]}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#888' }} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgb(24, 24, 27)', border: '1px solid rgb(39, 39, 42)', borderRadius: '12px', fontSize: '10px' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString([], { dateStyle: 'medium' })}
                      />
                      <Area type="monotone" dataKey="avg_score" name="Avg Score" stroke="rgb(59, 130, 246)" fillOpacity={1} fill="url(#colorCSAT)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CSAT Distribution */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" />
                    CSAT Distribution
                  </h3>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.score_distribution || []} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="score" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#888' }} 
                        tickFormatter={(val) => `${val} Stars`}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ backgroundColor: 'rgb(24, 24, 27)', border: '1px solid rgb(39, 39, 42)', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {(data?.score_distribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={scoreColors[entry.score - 1]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI vs Human Performance */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                AI vs Human Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['agent', 'ai'].map((type) => {
                  const stats = data?.entity_comparison[type];
                  return (
                    <div key={type} className="bg-card border border-border p-6 rounded-3xl flex items-center justify-between shadow-sm group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                          type === 'ai' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                          {type === 'ai' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            {type === 'ai' ? 'Artificial Intelligence' : 'Human Agents'}
                          </p>
                          <h4 className="text-lg font-bold text-foreground capitalize">{type === 'ai' ? 'AI Assistant' : 'Human Support'}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-2xl font-black text-foreground">{stats?.avg_score || 'N/A'}</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{stats?.count || 0} Feedbacks</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'surveys' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Post-Conversation CSAT', desc: 'Sent after a conversation is closed.', active: true },
                { title: 'NPS Survey', desc: 'Measure long-term loyalty and brand sentiment.', active: false },
                { title: 'Product Feedback', desc: 'Gather insights on specific feature usage.', active: true },
              ].map((survey) => (
                <div key={survey.title} className="bg-card border border-border p-6 rounded-3xl hover:border-primary/50 transition-all group shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full px-1 flex items-center transition-colors cursor-pointer",
                      survey.active ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "w-3 h-3 rounded-full bg-white transition-all transform",
                        survey.active ? "translate-x-4" : "translate-x-0"
                      )} />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{survey.title}</h3>
                  <p className="text-[10px] text-muted-foreground mb-4">{survey.desc}</p>
                  <button className="w-full py-2 bg-accent text-foreground rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-accent/80 transition-all">
                    Edit Survey
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
