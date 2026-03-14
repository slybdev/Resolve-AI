import React from 'react';
import { CreditCard, CheckCircle2, ArrowUpRight, Clock, Download, Zap } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const Billing = () => {
  return (
    <div className="flex flex-col h-full w-full bg-background p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-5xl w-full mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your plan, payment methods, and billing history.</p>
        </div>

        {/* Current Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 space-y-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Current Plan</h3>
                <h2 className="text-2xl font-bold text-foreground">Pro Enterprise</h2>
              </div>
              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">Active</span>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Next Billing Date</p>
                <p className="text-lg font-bold text-foreground">April 12, 2024</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount Due</p>
                <p className="text-lg font-bold text-foreground">$499.00</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">AI Messages Used</span>
                <span className="text-foreground font-bold">42,500 / 100,000</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '42.5%' }} />
              </div>
            </div>

            <div className="pt-8 border-t border-border flex gap-4">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-colors">
                Upgrade Plan
              </button>
              <button className="px-6 py-3 bg-muted text-foreground border border-border rounded-xl text-sm font-bold hover:bg-accent transition-colors">
                Cancel Subscription
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 space-y-6 shadow-sm">
            <h3 className="text-sm font-bold text-foreground">Payment Method</h3>
            <div className="p-4 bg-muted/50 border border-border rounded-2xl flex items-center gap-4">
              <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">•••• 4242</p>
                <p className="text-[10px] text-muted-foreground">Expires 12/26</p>
              </div>
              <button className="ml-auto p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
            <button className="w-full py-3 bg-muted text-foreground border border-border rounded-xl text-xs font-bold hover:bg-accent transition-colors">
              Update Payment Method
            </button>
          </div>
        </div>

        {/* Billing History */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Billing History</h2>
            <button className="text-xs text-primary hover:underline">View All</button>
          </div>
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Invoice ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'INV-2024-001', date: 'Mar 12, 2024', amount: '$499.00', status: 'Paid' },
                  { id: 'INV-2024-002', date: 'Feb 12, 2024', amount: '$499.00', status: 'Paid' },
                  { id: 'INV-2024-003', date: 'Jan 12, 2024', amount: '$499.00', status: 'Paid' }
                ].map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{invoice.id}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{invoice.date}</td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">{invoice.amount}</td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20 rounded text-[10px] font-bold uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        {invoice.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
