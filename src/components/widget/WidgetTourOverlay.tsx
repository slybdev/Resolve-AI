import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { loadGoogleFont } from '@/src/lib/fonts';

interface TourStep {
  title: string;
  body: string;
  image_url?: string;
}

interface TourConfig {
  steps: TourStep[];
  font_family?: string;
  bg_color?: string;
  bg_gradient_end?: string;
  text_color?: string;
  title_color?: string;
  accent_color?: string;
  layout_variant?: 'default' | 'gradient' | 'glass';
  button_border_radius?: 'rounded-none' | 'rounded-lg' | 'rounded-xl' | 'rounded-full';
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

  const accentColor = config.accent_color || primaryColor;
  const fontFamily = config.font_family || '';

  useEffect(() => {
    if (fontFamily) {
      loadGoogleFont(fontFamily);
    }
  }, [fontFamily]);

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

  const fontStyle = fontFamily ? { fontFamily: `'${fontFamily}', sans-serif` } : {};
  const isDark = theme === 'dark';
  const layout = config.layout_variant || 'default';

  // Styling Setup
  let cardStyle: React.CSSProperties = {};
  let cardClassName = "relative z-10 w-full max-w-[320px] rounded-3xl overflow-hidden border shadow-2xl transition-all duration-300";

  if (layout === 'gradient') {
    const startColor = config.bg_color || accentColor;
    const endColor = config.bg_gradient_end || '#8b5cf6';
    cardStyle = {
      background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
    };
    cardClassName += " border-transparent text-white";
  } else if (layout === 'glass') {
    const glassBg = config.bg_color || (isDark ? '#1a1c1e' : '#ffffff');
    cardStyle = {
      backgroundColor: `${glassBg}40`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    };
    cardClassName += isDark ? " border-white/[0.08]" : " border-slate-200";
  } else {
    // default solid
    cardStyle = {
      backgroundColor: config.bg_color || (isDark ? '#1a1c1e' : '#ffffff'),
    };
    cardClassName += isDark ? " border-white/[0.08]" : " border-slate-200";
  }

  // Dynamic Text Colors & Sizes
  let titleTextColor = config.title_color;
  let bodyTextColor = config.text_color;
  
  if (!titleTextColor) {
    if (layout === 'gradient') titleTextColor = '#ffffff';
    else titleTextColor = isDark ? '#ffffff' : '#0f172a';
  }
  if (!bodyTextColor) {
    if (layout === 'gradient') bodyTextColor = 'rgba(255, 255, 255, 0.8)';
    else bodyTextColor = isDark ? 'rgba(255, 255, 255, 0.55)' : '#475569';
  }

  const titleSizeStyle = config.title_font_size ? { fontSize: `${config.title_font_size}px` } : {};
  const bodySizeStyle = config.body_font_size ? { fontSize: `${config.body_font_size}px` } : {};

  // Button styles
  const btnRadius = config.button_border_radius || 'rounded-xl';
  const nextBtnStyle: React.CSSProperties = {
    background: layout === 'gradient'
      ? '#ffffff'
      : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
    color: layout === 'gradient' ? accentColor : '#ffffff',
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
        style={{ ...cardStyle, ...fontStyle }}
        className={cardClassName}
      >
        {/* Close Button */}
        <button
          onClick={() => onDismiss(id)}
          className={cn(
            "absolute top-3 right-3 z-20 p-1.5 rounded-full transition-all",
            layout === 'gradient'
              ? "hover:bg-white/10 text-white/70 hover:text-white"
              : (isDark ? "hover:bg-white/10 text-white/50 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600")
          )}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image Area */}
        {step.image_url ? (
          <div className="w-full h-40 overflow-hidden border-b border-white/[0.04]">
            <img
              src={step.image_url}
              alt={step.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-full h-28 flex items-center justify-center"
            style={{ background: layout === 'gradient' ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)` }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-10 h-10" style={{ color: layout === 'gradient' ? '#ffffff' : accentColor }} />
            </motion.div>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Tour title badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md"
              style={{
                background: layout === 'gradient' ? 'rgba(255,255,255,0.15)' : `${accentColor}15`,
                color: layout === 'gradient' ? '#ffffff' : accentColor
              }}
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
              <h3 
                style={{ color: titleTextColor, ...titleSizeStyle }}
                className="text-base font-bold leading-tight mb-2"
              >
                {step.title || `Step ${currentStep + 1}`}
              </h3>
              <p 
                style={{ color: bodyTextColor, ...bodySizeStyle }}
                className="text-[12px] leading-relaxed whitespace-pre-line"
              >
                {step.body || 'No description.'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: Navigation */}
        <div className="px-5 pb-5 flex items-center justify-between">
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentStep ? "w-5" : "w-1.5"
                )}
                style={{
                  backgroundColor: i <= currentStep 
                    ? (layout === 'gradient' ? '#ffffff' : accentColor) 
                    : (layout === 'gradient' ? 'rgba(255, 255, 255, 0.2)' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)'))
                }}
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
                  layout === 'gradient'
                    ? "hover:bg-white/10 text-white/70 hover:text-white"
                    : (isDark ? "hover:bg-white/5 text-white/50 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600")
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                "px-5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg",
                btnRadius
              )}
              style={nextBtnStyle}
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
