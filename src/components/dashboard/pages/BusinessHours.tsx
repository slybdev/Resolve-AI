import React, { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
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

export const BusinessHours = ({ workspaceId }: { workspaceId: string }) => {
  const [timezone, setTimezone] = useState('UTC-5 (Eastern Time)');
  const [slaTime, setSlaTime] = useState('10'); // minutes
  const [hours, setHours] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.settings.getBusinessHours(workspaceId);
      if (data && data.length > 0) {
        setHours(data.sort((a: any, b: any) => a.day_of_week - b.day_of_week));
      } else {
        // Initialize defaults if none exist
        const defaults = [0, 1, 2, 3, 4, 5, 6].map(dayNum => ({
          day_of_week: dayNum,
          is_closed: dayNum === 5 || dayNum === 6,
          open_time: '09:00:00',
          close_time: '17:00:00'
        }));
        setHours(defaults);
      }
    } catch (err) {
      console.error("Failed to fetch business hours", err);
    } finally {
      setIsLoading(false);
    }
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await api.settings.updateBusinessHours(workspaceId, hours);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateHour = (index: number, field: string, value: any) => {
    const updated = [...hours];
    updated[index] = { ...updated[index], [field]: value };
    setHours(updated);
  };

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
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all btn-press shadow-lg",
                saveStatus === 'success' ? "bg-green-500 text-white shadow-green-500/20" :
                saveStatus === 'error' ? "bg-red-500 text-white shadow-red-500/20" :
                "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90"
              )}
            >
              {isSaving ? <Timer className="w-4 h-4 animate-spin" /> : 
               saveStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
               saveStatus === 'error' ? <AlertCircle className="w-4 h-4" /> :
               <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 
               saveStatus === 'success' ? 'Saved!' : 
               saveStatus === 'error' ? 'Retry' : 
               'Save Settings'}
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
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground animate-pulse font-bold uppercase tracking-widest text-[10px]">
                        Loading Schedule...
                      </td>
                    </tr>
                  ) : hours.map((item, index) => (
                    <tr key={item.day_of_week} className="hover:bg-accent/20 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-foreground">{dayNames[item.day_of_week]}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => updateHour(index, 'is_closed', !item.is_closed)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                            !item.is_closed ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-accent text-muted-foreground hover:bg-accent/80"
                          )}
                        >
                          {!item.is_closed ? 'Open' : 'Closed'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn("flex items-center gap-2 transition-opacity", item.is_closed && "opacity-20 pointer-events-none")}>
                          <input 
                            type="time" 
                            value={item.open_time?.substring(0, 5) || "09:00"} 
                            onChange={(e) => updateHour(index, 'open_time', `${e.target.value}:00`)}
                            className="bg-accent/50 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" 
                          />
                          <span className="text-muted-foreground">to</span>
                          <input 
                            type="time" 
                            value={item.close_time?.substring(0, 5) || "17:00"} 
                            onChange={(e) => updateHour(index, 'close_time', `${e.target.value}:00`)}
                            className="bg-accent/50 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" 
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {/* Placeholder for removing day if needed */}
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
