import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  MessageSquare, 
  Bot, 
  User, 
  Clock, 
  Smile, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'framer-motion';

const data = [
  { name: 'Mon', ai: 400, human: 240 },
  { name: 'Tue', ai: 300, human: 139 },
  { name: 'Wed', ai: 200, human: 980 },
  { name: 'Thu', ai: 278, human: 390 },
  { name: 'Fri', ai: 189, human: 480 },
  { name: 'Sat', ai: 239, human: 380 },
  { name: 'Sun', ai: 349, human: 430 },
];

const pieData = [
  { name: 'AI Resolved', value: 72 },
  { name: 'Human Escalated', value: 28 },
];

const COLORS = ['#3B82F6', '#6366F1'];

const Counter = ({ value, duration = 2 }: { value: string, duration?: number }) => {
  const [count, setCount] = useState(0);
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  const suffix = value.replace(/[0-9.]/g, '');
  const prefix = value.startsWith('$') ? '$' : '';

  useEffect(() => {
    let start = 0;
    const end = numericValue;
    if (start === end) return;

    let totalMiliseconds = duration * 1000;
    let incrementTime = (totalMiliseconds / end);

    let timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [numericValue, duration]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

const StatCard = ({ label, value, trend, icon: Icon, colorClass, index }: { label: string, value: string, trend: string, icon: any, colorClass: string, index: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="bg-card border border-border p-6 rounded-3xl space-y-4 hover:border-primary/50 transition-all group shadow-sm"
  >
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
      <h3 className="text-2xl font-bold text-foreground">
        <Counter value={value} />
      </h3>
    </div>
  </motion.div>
);

export const AnalyticsOverview = ({ workspaceId }: { workspaceId: string }) => {
  return (
    <div className="flex flex-col h-full w-full bg-background p-6 overflow-y-auto no-scrollbar">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <select className="px-4 py-2 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              Export Report
            </button>
          </motion.div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard index={0} label="Total Conversations" value="1284" trend="+12.5%" icon={MessageSquare} colorClass="bg-blue-500 shadow-blue-500/20" />
          <StatCard index={1} label="AI Resolved" value="72%" trend="+5.2%" icon={Bot} colorClass="bg-purple-500 shadow-purple-500/20" />
          <StatCard index={2} label="Human Escalations" value="359" trend="-2.1%" icon={User} colorClass="bg-orange-500 shadow-orange-500/20" />
          <StatCard index={3} label="Avg Response Time" value="42s" trend="-15.4%" icon={Clock} colorClass="bg-green-500 shadow-green-500/20" />
          <StatCard index={4} label="Customer Satisfaction" value="4.8/5" trend="+0.3%" icon={Smile} colorClass="bg-pink-500 shadow-pink-500/20" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Volume Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-card border border-border p-8 rounded-3xl space-y-8 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Daily Conversation Volume</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">AI Responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Human Responses</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHuman" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="ai" stroke="#3B82F6" fillOpacity={1} fill="url(#colorAi)" strokeWidth={3} />
                  <Area type="monotone" dataKey="human" stroke="#6366F1" fillOpacity={1} fill="url(#colorHuman)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Distribution Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card border border-border p-8 rounded-3xl space-y-8 shadow-sm"
          >
            <h3 className="text-sm font-bold text-foreground">Resolution Distribution</h3>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground">72%</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">AI Resolved</span>
              </div>
            </div>
            <div className="space-y-4">
              {pieData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-xs text-muted-foreground font-medium">{entry.name}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{entry.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
