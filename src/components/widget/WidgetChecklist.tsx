import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
}

interface ChecklistConfig {
  items: ChecklistItem[];
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

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all",
      theme === 'dark' ? "bg-[#1f1f23] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm"
    )}>
      {/* Header / Progress Section */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex flex-col gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "text-[13px] font-bold",
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              {name}
            </h4>
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              theme === 'dark' ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-500"
            )}>
              {completedCount}/{items.length}
            </span>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full"
            style={{ backgroundColor: primaryColor }}
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
            className="border-t border-white/[0.04]"
          >
            <div className="p-2 space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    "w-full p-2.5 rounded-xl flex items-start gap-3 text-left transition-all group",
                    theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: primaryColor }} />
                    ) : (
                      <Circle className="w-4 h-4 opacity-20 group-hover:opacity-40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[12px] font-medium transition-all",
                      item.completed ? "opacity-40 line-through" : (theme === 'dark' ? "text-white/80" : "text-slate-700")
                    )}>
                      {item.title}
                    </p>
                    {item.description && !item.completed && (
                      <p className={cn(
                        "text-[10px] mt-0.5",
                        theme === 'dark' ? "text-white/40" : "text-slate-400"
                      )}>
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
