import React, { useState, useEffect } from 'react';
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
  ArrowDownRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';

interface PerformanceSummary {
  total_resolved: number;
  overall_avg_rating: number | null;
  overall_avg_frt: number | null;
  active_agents: number;
  period_days: number;
}

interface AgentStats {
  id: string;
  name: string;
  email: string;
  role: string;
  resolved_count: number;
  avg_frt: number | null;
  avg_rating: number | null;
  rating_count: number;
}

const StatCard = ({ label, value, trend, icon: Icon, colorClass }: { label: string, value: string, trend?: string, icon: any, colorClass: string }) => (
  <div className="bg-card border border-border p-6 rounded-3xl space-y-4 hover:border-primary/50 transition-all group shadow-sm">
    <div className="flex items-center justify-between">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg", colorClass)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
          trend.startsWith('+') ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
        )}>
          {trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-foreground">{value}</h3>
    </div>
  </div>
);

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return 'N/A';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

export const AgentPerformance = ({ workspaceId }: { workspaceId: string }) => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ summary: PerformanceSummary, agents: AgentStats[] } | null>(null);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const result = await api.analytics.getAgentPerformance(workspaceId, days);
      if (result) {
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchPerformance();
    }
  }, [workspaceId, days]);

  if (loading && !data) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const summary = data?.summary;
  const agents = data?.agents || [];

  return (
    <div className="flex flex-col h-full w-full bg-background p-6 overflow-y-auto no-scrollbar">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            <select 
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              Export CSV
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Resolved" 
            value={summary?.total_resolved.toString() || '0'} 
            icon={CheckCircle2} 
            colorClass="bg-blue-500 shadow-blue-500/20" 
          />
          <StatCard 
            label="Avg Response Time" 
            value={formatDuration(summary?.overall_avg_frt || null)} 
            icon={Clock} 
            colorClass="bg-purple-500 shadow-purple-500/20" 
          />
          <StatCard 
            label="Avg Rating" 
            value={summary?.overall_avg_rating ? `${summary.overall_avg_rating}/5` : 'N/A'} 
            icon={Smile} 
            colorClass="bg-green-500 shadow-green-500/20" 
          />
          <StatCard 
            label="Active Agents" 
            value={summary?.active_agents.toString() || '0'} 
            icon={User} 
            colorClass="bg-orange-500 shadow-orange-500/20" 
          />
        </div>

        {/* Agent Table */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agent</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Resolved</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Avg Response</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Avg Rating</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Ratings</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performance</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground italic">
                    No performance data found for the selected period.
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-border hover:bg-accent transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent border border-border flex items-center justify-center uppercase font-bold text-[10px] text-muted-foreground">
                          {agent.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{agent.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{agent.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-muted-foreground font-mono font-bold">{agent.resolved_count}</td>
                    <td className="px-6 py-4 text-xs text-center text-muted-foreground font-bold">{formatDuration(agent.avg_frt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Smile className={cn("w-3.5 h-3.5", agent.avg_rating ? "text-yellow-500" : "text-muted-foreground")} />
                        <span className="text-sm font-bold text-foreground">{agent.avg_rating || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-center text-muted-foreground font-medium uppercase tracking-wider">
                      {agent.rating_count} feedbacks
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 h-1.5 bg-accent rounded-full overflow-hidden">
                        <div className={cn(
                          "h-full transition-all duration-500",
                          agent.resolved_count > 0 ? "bg-primary" : "bg-transparent"
                        )} style={{ width: summary?.total_resolved ? `${(agent.resolved_count / summary.total_resolved) * 100}%` : '0%' }} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors btn-press">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
