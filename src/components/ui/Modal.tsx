import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, className }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250]"
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[251]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "bg-card border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl pointer-events-auto",
                className
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
