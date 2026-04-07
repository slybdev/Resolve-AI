import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'notification';

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "pointer-events-auto w-80 p-4 rounded-2xl border shadow-2xl flex gap-3 bg-card",
                t.type === 'success' && "border-green-500/20",
                t.type === 'error' && "border-red-500/20",
                t.type === 'info' && "border-primary/20",
                t.type === 'notification' && "border-border"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                t.type === 'success' && "bg-green-500/10 text-green-500",
                t.type === 'error' && "bg-red-500/10 text-red-500",
                t.type === 'info' && "bg-primary/10 text-primary",
                t.type === 'notification' && "bg-accent text-foreground"
              )}>
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {t.type === 'info' && <Info className="w-5 h-5" />}
                {t.type === 'notification' && <Bell className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate">{t.title}</h4>
                {t.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.message}</p>}
              </div>
              <button 
                onClick={() => removeToast(t.id)}
                className="p-1 hover:bg-accent rounded-lg text-muted-foreground transition-colors h-fit"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
