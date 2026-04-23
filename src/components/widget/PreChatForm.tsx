import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface PreChatFormProps {
  primaryColor: string;
  theme: 'light' | 'dark';
  onSubmit: (data: { name: string; email: string; message: string }) => void;
  isLoading?: boolean;
  initialName?: string;
  initialEmail?: string;
}

export const PreChatForm = ({ primaryColor, theme, onSubmit, isLoading, initialName = '', initialEmail = '' }: PreChatFormProps) => {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSubmit({ name, email, message });
  };

  const isDark = theme === 'dark';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto no-scrollbar"
    >
      <div className="space-y-2 text-center py-2">
        <h3 className={cn(
          "text-lg font-bold tracking-tight",
          isDark ? "text-white" : "text-slate-900"
        )}>
          Introduce Yourself
        </h3>
        <p className={cn(
          "text-[12px] font-medium",
          isDark ? "text-slate-400" : "text-slate-500"
        )}>
          Please fill out the form below to start chatting with our team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className={cn(
            "text-[10px] font-bold uppercase tracking-widest ml-1",
            isDark ? "text-slate-500" : "text-slate-400"
          )}>
            Full Name *
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
              <User className="w-4 h-4" />
            </div>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className={cn(
                "w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm transition-all outline-none border",
                isDark 
                  ? "bg-slate-800/50 border-slate-700 focus:border-primary/50 text-white" 
                  : "bg-slate-50 border-slate-200 focus:border-primary/50 text-slate-900"
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className={cn(
            "text-[10px] font-bold uppercase tracking-widest ml-1",
            isDark ? "text-slate-500" : "text-slate-400"
          )}>
            Email Address *
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
              <Mail className="w-4 h-4" />
            </div>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className={cn(
                "w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm transition-all outline-none border",
                isDark 
                  ? "bg-slate-800/50 border-slate-700 focus:border-primary/50 text-white" 
                  : "bg-slate-50 border-slate-200 focus:border-primary/50 text-slate-900"
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className={cn(
            "text-[10px] font-bold uppercase tracking-widest ml-1",
            isDark ? "text-slate-500" : "text-slate-400"
          )}>
            How can we help today?
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors">
              <MessageSquare className="w-4 h-4" />
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us a bit about your inquiry..."
              rows={3}
              className={cn(
                "w-full pl-11 pr-4 py-4 rounded-2xl text-sm transition-all outline-none border resize-none",
                isDark 
                  ? "bg-slate-800/50 border-slate-700 focus:border-primary/50 text-white" 
                  : "bg-slate-50 border-slate-200 focus:border-primary/50 text-slate-900"
              )}
            />
          </div>
        </div>

        <button
          disabled={isLoading || !name.trim() || !email.trim()}
          type="submit"
          style={{ backgroundColor: primaryColor }}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Start Chat
            </>
          )}
        </button>
      </form>

      <div className="pt-4 text-center">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-50">
          Secure & Professional Communication
        </p>
      </div>
    </motion.div>
  );
};
