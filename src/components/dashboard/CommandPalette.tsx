import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  MessageSquare, 
  User, 
  Settings, 
  Zap, 
  HelpCircle, 
  FileText, 
  Plus,
  ArrowRight,
  Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (view: string) => void;
}

const commands = [
  { id: 'all-conversations', name: 'Go to Inbox', icon: MessageSquare, category: 'Navigation', shortcut: 'G I' },
  { id: 'people', name: 'Search Customers', icon: User, category: 'Navigation', shortcut: 'G C' },
  { id: 'help-center', name: 'Manage Help Center', icon: HelpCircle, category: 'Navigation', shortcut: 'G H' },
  { id: 'ai-settings', name: 'AI Settings', icon: Zap, category: 'Settings', shortcut: 'G S' },
  { id: 'new-article', name: 'Create New Article', icon: Plus, category: 'Actions', shortcut: 'C A' },
  { id: 'new-outbound', name: 'New Outbound Campaign', icon: Zap, category: 'Actions', shortcut: 'C O' },
];

export const CommandPalette = ({ isOpen, onClose, onSelect }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        onSelect(filteredCommands[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-lg"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-1 px-2 py-1 bg-accent rounded-md border border-border">
                <span className="text-[10px] font-bold text-muted-foreground">ESC</span>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-2 no-scrollbar">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No commands found for "{query}"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(new Set(filteredCommands.map(c => c.category))).map(category => (
                    <div key={category} className="space-y-1">
                      <h4 className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {category}
                      </h4>
                      {filteredCommands
                        .filter(c => c.category === category)
                        .map((cmd, index) => {
                          const globalIndex = filteredCommands.indexOf(cmd);
                          return (
                            <button
                              key={cmd.id}
                              onClick={() => {
                                onSelect(cmd.id);
                                onClose();
                              }}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all group",
                                selectedIndex === globalIndex ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <cmd.icon className={cn(
                                  "w-4 h-4",
                                  selectedIndex === globalIndex ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )} />
                                <span className="text-sm font-medium">{cmd.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {cmd.shortcut && (
                                  <span className={cn(
                                    "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                                    selectedIndex === globalIndex ? "bg-white/20 border-white/20 text-white" : "bg-accent border-border text-muted-foreground"
                                  )}>
                                    {cmd.shortcut}
                                  </span>
                                )}
                                <ArrowRight className={cn(
                                  "w-3 h-3 transition-transform",
                                  selectedIndex === globalIndex ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                                )} />
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-accent/50 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="p-1 bg-card border border-border rounded text-[8px] font-bold text-muted-foreground">↑↓</div>
                  <span className="text-[10px] text-muted-foreground">Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="p-1 bg-card border border-border rounded text-[8px] font-bold text-muted-foreground">ENTER</div>
                  <span className="text-[10px] text-muted-foreground">Select</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Command className="w-3 h-3" />
                <span className="text-[10px] font-bold">K</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
