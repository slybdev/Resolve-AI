import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TourStep {
  title: string;
  body: string;
  image_url?: string;
}

interface TourConfig {
  steps: TourStep[];
}

interface WidgetTourOverlayProps {
  id: string;
  name: string;
  config: TourConfig;
  theme: 'light' | 'dark';
  primaryColor: string;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  isPreview?: boolean;
}

export const WidgetTourOverlay = ({
  id,
  name,
  config,
  theme,
  primaryColor,
  onComplete,
  onDismiss,
  isPreview = false
}: WidgetTourOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = config?.steps || [];

  if (steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    if (isLast) {
      onComplete(id);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(prev => prev - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onDismiss(id)} />

      {/* Tour Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative z-10 w-full max-w-[320px] rounded-3xl overflow-hidden border shadow-2xl",
          theme === 'dark'
            ? "bg-[#1a1c1e] border-white/[0.08]"
            : "bg-white border-slate-200"
        )}
      >
        {/* Close Button */}
        <button
          onClick={() => onDismiss(id)}
          className={cn(
            "absolute top-3 right-3 z-20 p-1.5 rounded-full transition-all",
            theme === 'dark'
              ? "hover:bg-white/10 text-white/50 hover:text-white"
              : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          )}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image Area */}
        {step.image_url ? (
          <div className="w-full h-40 overflow-hidden">
            <img
              src={step.image_url}
              alt={step.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-full h-28 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}08)` }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-10 h-10" style={{ color: primaryColor }} />
            </motion.div>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Tour title badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md"
              style={{ background: `${primaryColor}15`, color: primaryColor }}
            >
              {name}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className={cn(
                "text-base font-bold leading-tight mb-2",
                theme === 'dark' ? "text-white" : "text-slate-900"
              )}>
                {step.title || `Step ${currentStep + 1}`}
              </h3>
              <p className={cn(
                "text-[12px] leading-relaxed",
                theme === 'dark' ? "text-white/55" : "text-slate-500"
              )}>
                {step.body || 'No description.'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: Navigation */}
        <div className={cn(
          "px-5 pb-5 flex items-center justify-between",
        )}>
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentStep
                    ? "w-5"
                    : "w-1.5",
                  i <= currentStep ? "" : (theme === 'dark' ? "bg-white/10" : "bg-slate-200")
                )}
                style={i <= currentStep ? { backgroundColor: primaryColor } : undefined}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  theme === 'dark'
                    ? "hover:bg-white/5 text-white/50 hover:text-white"
                    : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                boxShadow: `0 4px 14px ${primaryColor}30`
              }}
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
