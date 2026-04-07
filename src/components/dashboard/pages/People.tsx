import React, { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import { 
  Users, Search, Filter, Download, MoreHorizontal, 
  Mail, Phone, MapPin, Calendar, Tag, ExternalLink,
  MessageSquare, Clock, Star, Shield, Zap, ArrowUpRight,
  ChevronRight, MoreVertical, Plus, UserPlus, FileText,
  Activity, CreditCard, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { LetterAvatar } from '../../ui/Avatar';


interface Customer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'active' | 'away' | 'offline';
  plan: 'Free' | 'Pro' | 'Enterprise';
  lastSeen: string;
  totalSpend: string;
  conversations: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  company: string;
  location: string;
}

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    email: 'alex.rivera@techflow.io',
    avatar: 'https://picsum.photos/seed/alex/100/100',
    status: 'active',
    plan: 'Enterprise',
    lastSeen: '2 mins ago',
    totalSpend: '$12,400',
    conversations: 42,
    sentiment: 'positive',
    tags: ['VIP', 'Early Adopter', 'SaaS'],
    company: 'TechFlow',
    location: 'San Francisco, CA'
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah.c@designly.com',
    avatar: 'https://picsum.photos/seed/sarah/100/100',
    status: 'offline',
    plan: 'Pro',
    lastSeen: '4 hours ago',
    totalSpend: '$2,100',
    conversations: 12,
    sentiment: 'neutral',
    tags: ['Design', 'Monthly'],
    company: 'Designly',
    location: 'New York, NY'
  },
  {
    id: '3',
    name: 'Marcus Thorne',
    email: 'm.thorne@global-logistics.com',
    avatar: 'https://picsum.photos/seed/marcus/100/100',
    status: 'away',
    plan: 'Enterprise',
    lastSeen: '15 mins ago',
    totalSpend: '$45,000',
    conversations: 156,
    sentiment: 'negative',
    tags: ['High Priority', 'Enterprise'],
    company: 'Global Logistics',
    location: 'London, UK'
  },
  {
    id: '4',
    name: 'Elena Rodriguez',
    email: 'elena@startup.co',
    avatar: 'https://picsum.photos/seed/elena/100/100',
    status: 'active',
    plan: 'Free',
    lastSeen: 'Just now',
    totalSpend: '$0',
    conversations: 3,
    sentiment: 'positive',
    tags: ['New User'],
    company: 'Startup.co',
    location: 'Madrid, ES'
  },
];

const SegmentItem = ({ label, count, active, onClick, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all group",
      active ? "bg-white text-black" : "text-muted-foreground hover:bg-white/5 hover:text-white"
    )}
  >
    <div className="flex items-center gap-3">
      <Icon className={cn("w-4 h-4", active ? "text-black" : "text-muted-foreground group-hover:text-white")} />
      <span>{label}</span>
    </div>
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full", active ? "bg-black/10 text-black" : "bg-white/5 text-muted-foreground")}>
      {count}
    </span>
  </button>
);

export const People = ({ workspaceId }: { workspaceId: string }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeSegment, setActiveSegment] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [workspaceId]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await api.contacts.list(workspaceId);
      // Transform backend data to frontend interface if necessary
      const formatted = response.items.map((item: any) => ({
        ...item,
        avatar: `https://picsum.photos/seed/${item.id}/100/100`,
        status: 'active', // Placeholder as backend doesn't have status yet
        plan: 'Free',
        lastSeen: 'Just now',
        totalSpend: '$0',
        conversations: 0,
        sentiment: 'neutral',
        company: item.company?.name || 'Independent',
        location: 'Remote'
      }));
      setCustomers(formatted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex bg-transparent overflow-hidden gap-2 p-2">
      {/* Segments Sidebar */}
      <div className="w-64 border border-border flex flex-col p-6 space-y-8 bg-card rounded-2xl">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6 px-4">Segments</h2>
          <div className="space-y-1">
            <SegmentItem label="All People" count={1240} active={activeSegment === 'all'} onClick={() => setActiveSegment('all')} icon={Users} />
            <SegmentItem label="Active Now" count={42} active={activeSegment === 'active'} onClick={() => setActiveSegment('active')} icon={Activity} />
            <SegmentItem label="New Users" count={156} active={activeSegment === 'new'} onClick={() => setActiveSegment('new')} icon={UserPlus} />
            <SegmentItem label="High Value" count={89} active={activeSegment === 'high-value'} onClick={() => setActiveSegment('high-value')} icon={CreditCard} />
            <SegmentItem label="Slipped Away" count={234} active={activeSegment === 'slipped'} onClick={() => setActiveSegment('slipped')} icon={Clock} />
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6 px-4">Tags</h2>
          <div className="space-y-1">
            {['VIP', 'Beta Tester', 'Enterprise', 'Churn Risk'].map(tag => (
              <button key={tag} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-white transition-colors group">
                <Tag className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button className="mt-auto flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10">
          <Plus className="w-4 h-4" />
          Create Segment
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border rounded-2xl">
        {/* Header */}
        <div className="p-8 border-b border-border flex items-center justify-between bg-card">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter mb-1">People & CRM</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage your customer relationships and interaction history.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl shadow-white/10">
              <UserPlus className="w-4 h-4" />
              Add Person
            </button>
          </div>
        </div>

        {/* Search & Bulk Actions */}
        <div className="px-8 py-4 border-b border-border flex items-center gap-4 bg-card/50">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name, email, company or custom attributes..."
              className="w-full bg-accent/30 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent text-muted-foreground hover:text-foreground transition-all text-xs font-bold border border-border">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-card/80 backdrop-blur-md z-10 border-b border-border">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Person</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Company</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Plan</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Last Seen</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
                      <div className="text-xs font-black text-muted-foreground uppercase tracking-widest">Loading Customers...</div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-red-500 font-bold">{error}</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground font-bold">No customers found.</td>
                </tr>
              ) : customers.map((customer) => (
                <motion.tr 
                  key={customer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedCustomer(customer)}
                  className={cn(
                    "group cursor-pointer transition-all",
                    selectedCustomer?.id === customer.id ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
                  )}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <LetterAvatar name={customer.name} size="md" className="rounded-2xl border border-white/10" />
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#050505]",
                          customer.status === 'active' ? "bg-emerald-500" : customer.status === 'away' ? "bg-amber-500" : "bg-white/20"
                        )} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white group-hover:text-primary transition-colors">{customer.name}</div>
                        <div className="text-[11px] text-muted-foreground font-medium">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold">
                      <Globe className="w-3.5 h-3.5 opacity-50" />
                      {customer.company}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      customer.plan === 'Enterprise' ? "bg-indigo-500/10 text-indigo-500" : 
                      customer.plan === 'Pro' ? "bg-white/10 text-white" : "bg-white/5 text-muted-foreground"
                    )}>
                      {customer.plan}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs text-muted-foreground font-bold">{customer.lastSeen}</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Sidebar */}
      <AnimatePresence>
        {selectedCustomer && (
          <motion.div
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            exit={{ x: 500 }}
            className="w-[450px] border-l border-white/5 bg-[#050505] flex flex-col overflow-hidden shadow-2xl z-20"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Customer Profile</h2>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground transition-all"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
              {/* Profile Header */}
              <div className="text-center space-y-6">
                <div className="relative inline-block">
                  <LetterAvatar name={selectedCustomer.name} size="xl" className="rounded-[2.5rem] border-4 border-white/5 shadow-2xl mx-auto" />
                  <div className={cn(
                    "absolute -bottom-2 -right-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 border-[#050505] shadow-xl",
                    selectedCustomer.status === 'active' ? "bg-emerald-500 text-white" : "bg-white/10 text-muted-foreground"
                  )}>
                    {selectedCustomer.status}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{selectedCustomer.name}</h3>
                  <p className="text-muted-foreground text-sm font-medium">{selectedCustomer.email}</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button className="p-3.5 bg-white text-black rounded-2xl hover:bg-white/90 transition-all shadow-lg">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <button className="p-3.5 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                    <Mail className="w-5 h-5" />
                  </button>
                  <button className="p-3.5 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                    <Phone className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/5">
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Total Value</div>
                  <div className="text-xl font-black text-white">{selectedCustomer.totalSpend}</div>
                </div>
                <div className="bg-white/[0.02] p-5 rounded-3xl border border-white/5">
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Conversations</div>
                  <div className="text-xl font-black text-white">{selectedCustomer.conversations}</div>
                </div>
              </div>

              {/* Attributes */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Attributes</h4>
                <div className="grid gap-4">
                  {[
                    { label: 'Company', value: selectedCustomer.company, icon: Globe },
                    { label: 'Location', value: selectedCustomer.location, icon: MapPin },
                    { label: 'Plan', value: selectedCustomer.plan, icon: CreditCard },
                    { label: 'Joined', value: 'Oct 12, 2023', icon: Calendar },
                  ].map((attr) => (
                    <div key={attr.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center gap-3">
                        <attr.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground">{attr.label}</span>
                      </div>
                      <span className="text-xs font-black text-white">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.tags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                  <button className="px-3 py-1.5 border border-dashed border-white/20 rounded-xl text-[10px] font-black text-muted-foreground hover:border-white/40 hover:text-white transition-all">
                    + Add Tag
                  </button>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Interaction Timeline</h4>
                <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                  {[
                    { action: 'Opened conversation', time: '2 mins ago', icon: MessageSquare, color: 'text-blue-500' },
                    { action: 'Viewed pricing page', time: '1 hour ago', icon: ArrowUpRight, color: 'text-purple-500' },
                    { action: 'Updated profile settings', time: 'Yesterday', icon: Users, color: 'text-emerald-500' },
                    { action: 'Subscription renewed', time: '3 days ago', icon: CreditCard, color: 'text-amber-500' },
                  ].map((activity, i) => (
                    <div key={i} className="flex gap-6 relative z-10">
                      <div className={cn("w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5", activity.color)}>
                        <activity.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="pt-1">
                        <div className="text-xs font-black text-white mb-0.5">{activity.action}</div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-white/[0.01]">
              <button className="w-full py-4 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-white/10 hover:bg-white/90 transition-all flex items-center justify-center gap-3">
                <MessageSquare className="w-4 h-4" />
                Open Conversation
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
