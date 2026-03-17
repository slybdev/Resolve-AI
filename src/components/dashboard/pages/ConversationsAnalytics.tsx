import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { 
  MessageCircle, 
  Clock, 
  Zap, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const conversationData = [
  { name: 'Mon', count: 420 },
  { name: 'Tue', count: 380 },
  { name: 'Wed', count: 510 },
  { name: 'Thu', count: 490 },
  { name: 'Fri', count: 620 },
  { name: 'Sat', count: 280 },
  { name: 'Sun', count: 310 },
];

const sentimentData = [
  { name: 'Positive', value: 65, color: '#10B981' },
  { name: 'Neutral', value: 25, color: '#6B7280' },
  { name: 'Negative', value: 10, color: '#EF4444' },
];

const StatCard = ({ label, value, trend, icon: Icon, colorClass }: { label: string, value: string, trend: string, icon: any, colorClass: string }) => (
  <div className="bg-card border border-border p-6 rounded-3xl space-y-4 hover:border-primary/50 transition-all group shadow-sm">
    <div className="flex items-center justify-between">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg", colorClass)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className={cn(
        "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
        trend.startsWith('+') ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
      )}>
        {trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-foreground">{value}</h3>
    </div>
  </div>
);

export const ConversationsAnalytics = ({ workspaceId }: { workspaceId: string }) => {
  return (
    <div className="flex flex-col h-full w-full bg-background p-6 overflow-y-auto no-scrollbar">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            <select className="px-4 py-2 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              Export CSV
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Chats" value="3,010" trend="+8.4%" icon={MessageCircle} colorClass="bg-blue-500 shadow-blue-500/20" />
          <StatCard label="Avg Duration" value="4m 12s" trend="-2.1%" icon={Clock} colorClass="bg-purple-500 shadow-purple-500/20" />
          <StatCard label="Resolution Rate" value="88.5%" trend="+1.2%" icon={Zap} colorClass="bg-green-500 shadow-green-500/20" />
          <StatCard label="Escalation Rate" value="11.5%" trend="-0.5%" icon={AlertCircle} colorClass="bg-red-500 shadow-red-500/20" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Volume Chart */}
          <div className="bg-card border border-border p-8 rounded-3xl space-y-8 shadow-sm">
            <h3 className="text-sm font-bold text-foreground">Conversation Volume</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conversationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: 'hsl(var(--background))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div className="bg-card border border-border p-8 rounded-3xl space-y-8 shadow-sm">
            <h3 className="text-sm font-bold text-foreground">Sentiment Distribution</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" horizontal={false} />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} hide />
                  <YAxis dataKey="name" type="category" stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {sentimentData.map((entry, i) => (
                <div key={i} className="bg-accent/50 border border-border p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{entry.name}</p>
                  <h4 className="text-xl font-bold text-foreground">{entry.value}%</h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
