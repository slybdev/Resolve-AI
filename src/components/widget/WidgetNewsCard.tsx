import React from 'react';
import { motion } from 'framer-motion';
import { Newspaper, X, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface NewsConfig {
  cta_label?: string;
  cta_url?: string;
  accent_color?: string;
}

interface WidgetNewsCardProps {
  id: string;
  name: string;
  message: string;
  config?: NewsConfig;
  theme: 'light' | 'dark';
  primaryColor: string;
  onDismiss: (id: string) => void;
  isPreview?: boolean;
}

export const WidgetNewsCard = ({
  id,
  name,
  message,
  config = {},
  theme,
  primaryColor,
  onDismiss,
  isPreview = false
}: WidgetNewsCardProps) => {
  const accentColor = config.accent_color || primaryColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-2xl border overflow-hidden relative group",
        theme === 'dark'
          ? "bg-[#1f1f23] border-white/[0.06]"
          : "bg-white border-slate-200 shadow-sm"
      )}
    >
      {/* Accent top bar */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }}
      />

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(id)}
        className={cn(
          "absolute top-3 right-3 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10",
          theme === 'dark'
            ? "hover:bg-white/10 text-white/40 hover:text-white/70"
            : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        )}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: `${accentColor}18` }}
          >
            <Newspaper className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className={cn(
              "text-[13px] font-bold leading-tight truncate",
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              {name || 'Untitled'}
            </h4>
          </div>
        </div>

        {/* Body */}
        <p className={cn(
          "text-[12px] leading-relaxed mt-2",
          theme === 'dark' ? "text-white/60" : "text-slate-500"
        )}>
          {message || 'No message content.'}
        </p>

        {/* CTA Button */}
        {config.cta_label && (
          <div className="mt-3">
            <a
              href={isPreview ? '#' : (config.cta_url || '#')}
              target={isPreview ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={(e) => isPreview && e.preventDefault()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: `0 4px 14px ${accentColor}30`
              }}
            >
              {config.cta_label}
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
};
