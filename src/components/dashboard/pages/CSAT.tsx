import React, { useState } from 'react';
import { 
  Star, Heart, Search, Plus, Filter, MoreHorizontal, 
  BarChart3, MessageSquare, Zap, Clock, Smile, Frown,
  Meh, TrendingUp, Users, ShieldCheck, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

const sentimentData = [
  { name: 'Mon', positive: 65, neutral: 25, negative: 10 },
  { name: 'Tue', positive: 70, neutral: 20, negative: 10 },
  { name: 'Wed', positive: 60, neutral: 30, negative: 10 },
  { name: 'Thu', positive: 75, neutral: 15, negative: 10 },
  { name: 'Fri', positive: 80, neutral: 15, negative: 5 },
  { name: 'Sat', positive: 85, neutral: 10, negative: 5 },
  { name: 'Sun', positive: 90, neutral: 5, negative: 5 },
];

const csatScores = [
  { score: '5 Stars', count: 1240, color: '#10b981' },
  { score: '4 Stars', count: 450, color: '#34d399' },
  { score: '3 Stars', count: 120, color: '#f59e0b' },
  { score: '2 Stars', count: 45, color: '#f97316' },
  { score: '1 Star', count: 12, color: '#ef4444' },
];

export const CSAT = ({ workspaceId }: { workspaceId: string }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'surveys' | 'sentiment'>('overview');

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden gap-2 p-2">
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
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-card border border-border rounded-2xl shadow-sm">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Avg. CSAT', value: '4.8', icon: Star, change: '+0.2' },
                { label: 'Response Rate', value: '42%', icon: Users, change: '+5%' },
                { label: 'Positive Sentiment', value: '82%', icon: Smile, change: '+12%' },
                { label: 'Resolution Rate', value: '94%', icon: ShieldCheck, change: '+2%' },
              ].map((stat, i) => (
                <div key={i} className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <stat.icon className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{stat.change}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sentiment Chart */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Sentiment Trends
                  </h3>
                  <select className="bg-accent/50 border border-border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sentimentData}>
                      <defs>
                        <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#888' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#888' }} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Area type="monotone" dataKey="positive" stroke="#10b981" fillOpacity={1} fill="url(#colorPos)" />
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
                    <BarChart data={csatScores} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="score" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#888' }} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {csatScores.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Feedback */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground">Recent Customer Feedback</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { user: 'Alex Rivera', rating: 5, comment: "The AI agent handled my complex billing issue perfectly. Saved me 20 minutes of waiting!", sentiment: 'positive' },
                  { user: 'Sarah Chen', rating: 4, comment: "Great experience, but the voice agent was a bit slow to respond.", sentiment: 'neutral' },
                  { user: 'Marcus Thorne', rating: 2, comment: "Bot couldn't understand my tracking number. Had to wait for a human.", sentiment: 'negative' },
                ].map((feedback, i) => (
                  <div key={i} className="bg-card border border-border p-6 rounded-3xl space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                          {feedback.user[0]}
                        </div>
                        <span className="text-xs font-bold text-foreground">{feedback.user}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < feedback.rating ? "text-primary fill-primary" : "text-muted")} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">"{feedback.comment}"</p>
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        feedback.sentiment === 'positive' ? "bg-emerald-500/10 text-emerald-500" : 
                        feedback.sentiment === 'neutral' ? "bg-orange-500/10 text-orange-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {feedback.sentiment}
                      </div>
                    </div>
                  </div>
                ))}
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
                      "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                      survey.active ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                        survey.active ? "right-1" : "left-1"
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
