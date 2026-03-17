import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Bot, 
  Zap, 
  ShieldCheck, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const aiData = [
  { name: 'Mon', accuracy: 92, speed: 1.2 },
  { name: 'Tue', accuracy: 94, speed: 1.1 },
  { name: 'Wed', accuracy: 91, speed: 1.4 },
  { name: 'Thu', accuracy: 95, speed: 1.0 },
  { name: 'Fri', accuracy: 93, speed: 1.2 },
  { name: 'Sat', accuracy: 96, speed: 0.9 },
  { name: 'Sun', accuracy: 94, speed: 1.1 },
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

export const AIPerformance = ({ workspaceId }: { workspaceId: string }) => {
  return (
    <div className="flex flex-col h-full w-full bg-background p-6 overflow-y-auto no-scrollbar">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-card text-foreground border border-border rounded-xl text-xs font-bold hover:bg-accent transition-colors btn-press">
              <RefreshCw className="w-4 h-4" />
              Recalculate
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              Export Analysis
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="AI Accuracy" value="94.2%" trend="+2.4%" icon={ShieldCheck} colorClass="bg-blue-500 shadow-blue-500/20" />
          <StatCard label="Avg Latency" value="1.1s" trend="-0.3s" icon={Zap} colorClass="bg-yellow-500 shadow-yellow-500/20" />
          <StatCard label="Tokens Used" value="1.2M" trend="+15.2%" icon={Cpu} colorClass="bg-purple-500 shadow-purple-500/20" />
          <StatCard label="Escalation Rate" value="8.4%" trend="-1.2%" icon={AlertCircle} colorClass="bg-red-500 shadow-red-500/20" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Accuracy Chart */}
          <div className="bg-card border border-border p-8 rounded-3xl space-y-8 shadow-sm">
            <h3 className="text-sm font-bold text-foreground">AI Accuracy Trend</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} domain={[80, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: 'hsl(var(--background))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latency Chart */}
          <div className="bg-card border border-border p-8 rounded-3xl space-y-8 shadow-sm">
            <h3 className="text-sm font-bold text-foreground">Average Latency (Seconds)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                  />
                  <Bar dataKey="speed" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Model Usage Table */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-accent/50">
            <h3 className="text-sm font-bold text-foreground">Model Performance Breakdown</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Model Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Accuracy</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Latency</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cost / 1K Tokens</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Usage</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Gemini 3.1 Pro', accuracy: '96.4%', latency: '1.4s', cost: '$0.015', usage: '45%' },
                { name: 'Gemini 3 Flash', accuracy: '92.1%', latency: '0.6s', cost: '$0.002', usage: '55%' }
              ].map((m) => (
                <tr key={m.name} className="border-b border-border hover:bg-accent transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-foreground">{m.name}</td>
                  <td className="px-6 py-4 text-sm text-green-500 font-mono font-bold">{m.accuracy}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{m.latency}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{m.cost}</td>
                  <td className="px-6 py-4">
                    <div className="w-32 h-1.5 bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: m.usage }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
