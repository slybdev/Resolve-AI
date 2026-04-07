import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  User, 
  Clock, 
  CheckCircle2, 
  Smile, 
  MoreVertical, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const agentData = [
  { name: 'Tony', resolved: 145, rating: 4.9, time: '2m 15s' },
  { name: 'Steve', resolved: 120, rating: 4.8, time: '3m 10s' },
  { name: 'Natasha', resolved: 160, rating: 4.9, time: '1m 45s' },
  { name: 'Bruce', resolved: 95, rating: 4.5, time: '5m 30s' },
  { name: 'Wanda', resolved: 110, rating: 4.7, time: '2m 50s' },
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

export const AgentPerformance = ({ workspaceId }: { workspaceId: string }) => {
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
          <StatCard label="Total Resolved" value="630" trend="+15.2%" icon={CheckCircle2} colorClass="bg-blue-500 shadow-blue-500/20" />
          <StatCard label="Avg Response Time" value="2m 42s" trend="-12.4%" icon={Clock} colorClass="bg-purple-500 shadow-purple-500/20" />
          <StatCard label="Avg Rating" value="4.8/5" trend="+0.2%" icon={Smile} colorClass="bg-green-500 shadow-green-500/20" />
          <StatCard label="Active Agents" value="12" trend="+1" icon={User} colorClass="bg-orange-500 shadow-orange-500/20" />
        </div>

        {/* Agent Table */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agent</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Resolved</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Response Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CSAT Rating</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performance</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {agentData.map((agent) => (
                <tr key={agent.name} className="border-b border-border hover:bg-accent transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent border border-border" />
                      <span className="text-sm font-bold text-foreground">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{agent.resolved}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{agent.time}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Smile className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-sm font-bold text-foreground">{agent.rating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32 h-1.5 bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(agent.resolved / 160) * 100}%` }} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors btn-press">
                      <MoreVertical className="w-4 h-4" />
                    </button>
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
