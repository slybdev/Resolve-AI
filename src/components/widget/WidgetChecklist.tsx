import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { loadGoogleFont } from '@/src/lib/fonts';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
}

interface ChecklistConfig {
  items: ChecklistItem[];
  font_family?: string;
  bg_color?: string;
  bg_gradient_end?: string;
  text_color?: string;
  title_color?: string;
  title_font_size?: number;
  body_font_size?: number;
  accent_color?: string;
  layout_variant?: 'default' | 'gradient' | 'glass';
}

interface WidgetChecklistProps {
  id: string;
  name: string;
  config: ChecklistConfig;
  theme: 'light' | 'dark';
  primaryColor: string;
  onItemToggle?: (campaignId: string, itemId: string, completed: boolean) => void;
}

export const WidgetChecklist = ({
  id,
  name,
  config,
  theme,
  primaryColor,
  onItemToggle
}: WidgetChecklistProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>(config?.items || []);

  const accentColor = config.accent_color || primaryColor;
  const fontFamily = config.font_family || '';

  // Use localStorage to persist item state
  useEffect(() => {
    const storageKey = `xd_checklist_${id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const completedIds = JSON.parse(saved);
        setItems(prev => prev.map(item => ({
          ...item,
          completed: completedIds.includes(item.id)
        })));
      } catch (e) {}
    }
  }, [id]);

  useEffect(() => {
    if (fontFamily) {
      loadGoogleFont(fontFamily);
    }
  }, [fontFamily]);

  const toggleItem = (itemId: string) => {
    const newItems = items.map(item => {
      if (item.id === itemId) {
        const newCompleted = !item.completed;
        if (onItemToggle) onItemToggle(id, itemId, newCompleted);
        return { ...item, completed: newCompleted };
      }
      return item;
    });
    setItems(newItems);

    // Save to localStorage
    const completedIds = newItems.filter(i => i.completed).map(i => i.id);
    localStorage.setItem(`xd_checklist_${id}`, JSON.stringify(completedIds));
  };

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const fontStyle = fontFamily ? { fontFamily: `'${fontFamily}', sans-serif` } : {};
  const isDark = theme === 'dark';
  const layout = config.layout_variant || 'default';

  // Styling Setup
  let cardStyle: React.CSSProperties = {};
  let cardClassName = "rounded-2xl border overflow-hidden transition-all duration-300";

  if (layout === 'gradient') {
    const startColor = config.bg_color || accentColor;
    const endColor = config.bg_gradient_end || '#8b5cf6';
    cardStyle = {
      background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
    };
    cardClassName += " border-transparent text-white shadow-lg";
  } else if (layout === 'glass') {
    const glassBg = config.bg_color || (isDark ? '#1f1f23' : '#ffffff');
    cardStyle = {
      backgroundColor: `${glassBg}40`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    };
    cardClassName += isDark ? " border-white/[0.08] shadow-2xl" : " border-slate-200/80 shadow-md";
  } else {
    // solid bg
    cardStyle = {
      backgroundColor: config.bg_color || (isDark ? '#1f1f23' : '#ffffff'),
    };
    cardClassName += isDark ? " border-white/[0.06]" : " border-slate-200 shadow-sm";
  }

  // Dynamic Text Colors
  let titleTextColor = config.title_color;
  let bodyTextColor = config.text_color;
  
  if (!titleTextColor) {
    if (layout === 'gradient') titleTextColor = '#ffffff';
    else titleTextColor = isDark ? '#ffffff' : '#0f172a';
  }
  if (!bodyTextColor) {
    if (layout === 'gradient') bodyTextColor = 'rgba(255, 255, 255, 0.8)';
    else bodyTextColor = isDark ? 'rgba(255, 255, 255, 0.6)' : '#475569';
  }

  const titleSizeStyle = config.title_font_size ? { fontSize: `${config.title_font_size}px` } : {};
  const bodySizeStyle = config.body_font_size ? { fontSize: `${config.body_font_size}px` } : {};

  return (
    <div 
      style={{ ...cardStyle, ...fontStyle }} 
      className={cardClassName}
    >
      {/* Header / Progress Section */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex flex-col gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 
              style={{ color: titleTextColor, ...titleSizeStyle }}
              className="text-[13px] font-bold"
            >
              {name}
            </h4>
            <span 
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                layout === 'gradient' ? "bg-white/20 text-white" : (isDark ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500")
              )}
            >
              {completedCount}/{items.length}
            </span>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
        </div>

        {/* Progress Bar */}
        <div className={cn(
          "h-1.5 w-full rounded-full overflow-hidden",
          layout === 'gradient' ? "bg-white/20" : "bg-white/10"
        )}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full"
            style={{ backgroundColor: layout === 'gradient' ? '#ffffff' : accentColor }}
          />
        </div>
      </button>

      {/* Items List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "border-t",
              layout === 'gradient' ? "border-white/10" : "border-white/[0.04]"
            )}
          >
            <div className="p-2 space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    "w-full p-2.5 rounded-xl flex items-start gap-3 text-left transition-all group",
                    layout === 'gradient' ? "hover:bg-white/10" : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50")
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: layout === 'gradient' ? '#ffffff' : accentColor }} />
                    ) : (
                      <Circle className="w-4 h-4 opacity-20 group-hover:opacity-40" style={layout === 'gradient' ? { color: '#ffffff' } : {}} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p 
                      style={{ color: item.completed ? undefined : bodyTextColor, ...bodySizeStyle }}
                      className={cn(
                        "text-[12px] font-medium transition-all",
                        item.completed && "opacity-40 line-through"
                      )}
                    >
                      {item.title}
                    </p>
                    {item.description && !item.completed && (
                      <p 
                        style={{ color: layout === 'gradient' ? 'rgba(255, 255, 255, 0.6)' : undefined }}
                        className={cn(
                          "text-[10px] mt-0.5",
                          layout !== 'gradient' && (isDark ? "text-white/40" : "text-slate-400")
                        )}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
