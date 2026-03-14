import React, { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  Globe, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Timer,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'framer-motion';

export const BusinessHours = () => {
  const [timezone, setTimezone] = useState('UTC-5 (Eastern Time)');
  const [slaTime, setSlaTime] = useState('10'); // minutes

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 p-8 overflow-y-auto no-scrollbar">
        <div className="max-w-4xl w-full mx-auto space-y-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Business Hours & SLA</h1>
              <p className="text-muted-foreground">Set your team's availability and response time targets.</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all btn-press shadow-lg shadow-primary/20">
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>

          {/* Timezone Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Timezone</h2>
            </div>
            <div className="p-6 bg-card border border-border rounded-3xl space-y-4">
              <p className="text-xs text-muted-foreground">All business hours and SLA calculations will be based on this timezone.</p>
              <select 
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 bg-accent/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option>UTC-8 (Pacific Time)</option>
                <option>UTC-5 (Eastern Time)</option>
                <option>UTC+0 (GMT)</option>
                <option>UTC+1 (Central European Time)</option>
              </select>
            </div>
          </div>

          {/* Business Hours Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Weekly Schedule</h2>
            </div>
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Day</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hours</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <tr key={day} className="hover:bg-accent/20 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-foreground">{day}</td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          day !== 'Saturday' && day !== 'Sunday' ? "bg-green-500/10 text-green-500" : "bg-accent text-muted-foreground"
                        )}>
                          {day !== 'Saturday' && day !== 'Sunday' ? 'Open' : 'Closed'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <input type="time" defaultValue="09:00" className="bg-accent/50 border border-border rounded-lg px-2 py-1 text-xs text-foreground" />
                          <span className="text-muted-foreground">to</span>
                          <input type="time" defaultValue="17:00" className="bg-accent/50 border border-border rounded-lg px-2 py-1 text-xs text-foreground" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-muted-foreground transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SLA Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Service Level Agreements (SLA)</h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-card border border-border rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Timer className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">First Response Target</h4>
                    <p className="text-[10px] text-muted-foreground">Target time for initial agent reply.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={slaTime}
                    onChange={(e) => setSlaTime(e.target.value)}
                    className="w-24 px-4 py-3 bg-accent/50 border border-border rounded-xl text-sm text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Minutes</span>
                </div>
              </div>

              <div className="p-6 bg-card border border-border rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Resolution Target</h4>
                    <p className="text-[10px] text-muted-foreground">Target time to close a conversation.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    defaultValue="120"
                    className="w-24 px-4 py-3 bg-accent/50 border border-border rounded-xl text-sm text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
