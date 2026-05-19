import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, X, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { loadGoogleFont } from '@/src/lib/fonts';

interface NewsConfig {
  cta_label?: string;
  cta_url?: string;
  accent_color?: string;
  font_family?: string;
  bg_color?: string;
  bg_gradient_end?: string;
  text_color?: string;
  title_color?: string;
  title_font_size?: number;
  body_font_size?: number;
  button_bg_color?: string;
  button_text_color?: string;
  button_border_radius?: 'rounded-none' | 'rounded-lg' | 'rounded-xl' | 'rounded-full';
  layout_variant?: 'default' | 'gradient' | 'minimal' | 'glass';
  header_image?: string;
  header_image_placement?: 'top' | 'cover';
  cover_overlay_opacity?: number;
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
  const fontFamily = config.font_family || '';
  
  useEffect(() => {
    if (fontFamily) {
      loadGoogleFont(fontFamily);
    }
  }, [fontFamily]);

  // Styling Setup
  const fontStyle = fontFamily ? { fontFamily: `'${fontFamily}', sans-serif` } : {};
  const isDark = theme === 'dark';
  
  const layout = config.layout_variant || 'default';
  const headerImg = config.header_image;
  const isCover = headerImg && config.header_image_placement === 'cover';
  
  // Dynamic Background & Border style
  let cardStyle: React.CSSProperties = {};
  let cardClassName = "rounded-2xl border overflow-hidden relative group transition-all duration-300";
  
  if (isCover) {
    const rawOpacity = config.cover_overlay_opacity !== undefined ? config.cover_overlay_opacity : (isDark ? 75 : 90);
    const opacityFraction = rawOpacity / 100;
    
    cardStyle = {
      backgroundImage: `url(${headerImg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      boxShadow: isDark 
        ? `inset 0 0 0 2000px rgba(15, 15, 17, ${opacityFraction})` 
        : `inset 0 0 0 2000px rgba(255, 255, 255, ${opacityFraction})`,
    };
    cardClassName += isDark ? " border-white/[0.06]" : " border-slate-200 shadow-sm";
  } else if (layout === 'gradient') {
    const startColor = config.bg_color || accentColor;
    const endColor = config.bg_gradient_end || '#8b5cf6';
    cardStyle = {
      background: `linear-gradient(135deg, ${startColor}, ${endColor})`,
    };
    cardClassName += " border-transparent text-white";
  } else if (layout === 'glass') {
    const glassBg = config.bg_color || (isDark ? '#1f1f23' : '#ffffff');
    cardStyle = {
      backgroundColor: `${glassBg}40`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    };
    cardClassName += isDark ? " border-white/[0.08] shadow-2xl" : " border-slate-200/80 shadow-md";
  } else {
    // default solid
    cardStyle = {
      backgroundColor: config.bg_color || (isDark ? '#1f1f23' : '#ffffff'),
    };
    cardClassName += isDark ? " border-white/[0.06]" : " border-slate-200 shadow-sm";
  }

  // Dynamic Text Colors & Sizes
  let titleColor = config.title_color;
  let bodyColor = config.text_color;
  
  if (!titleColor) {
    if (layout === 'gradient') titleColor = '#ffffff';
    else titleColor = isDark ? '#ffffff' : '#0f172a';
  }
  if (!bodyColor) {
    if (layout === 'gradient') bodyColor = 'rgba(255, 255, 255, 0.8)';
    else bodyColor = isDark ? 'rgba(255, 255, 255, 0.6)' : '#475569';
  }

  const titleSizeStyle = config.title_font_size ? { fontSize: `${config.title_font_size}px` } : {};
  const bodySizeStyle = config.body_font_size ? { fontSize: `${config.body_font_size}px` } : {};

  // CTA styles
  const btnRadius = config.button_border_radius || 'rounded-xl';
  const ctaStyle: React.CSSProperties = {
    backgroundColor: config.button_bg_color || accentColor,
    color: config.button_text_color || '#ffffff',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...cardStyle, ...fontStyle }}
      className={cardClassName}
    >
      {/* Accent top bar (Only show if not cover image or gradient) */}
      {!isCover && layout !== 'gradient' && (
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }}
        />
      )}

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(id)}
        className={cn(
          "absolute top-3 right-3 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10",
          isDark
            ? "hover:bg-white/10 text-white/40 hover:text-white/70"
            : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        )}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Top Media Placement (top image banner style) */}
      {headerImg && config.header_image_placement === 'top' && (
        <div className="w-full h-32 overflow-hidden border-b border-border/20">
          <img src={headerImg} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4 relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: `${accentColor}18` }}
          >
            <Newspaper className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 
              style={{ color: titleColor, ...titleSizeStyle }}
              className="text-[13px] font-bold leading-tight truncate"
            >
              {name || 'Untitled'}
            </h4>
          </div>
        </div>

        {/* Body */}
        <p 
          style={{ color: bodyColor, ...bodySizeStyle }}
          className="text-[12px] leading-relaxed mt-2 whitespace-pre-line"
        >
          {message || 'No message content.'}
        </p>

        {/* CTA Button */}
        {config.cta_label && (
          <div className="mt-4">
            {layout === 'minimal' ? (
              <a
                href={isPreview ? '#' : (config.cta_url || '#')}
                target={isPreview ? undefined : "_blank"}
                rel="noopener noreferrer"
                onClick={(e) => isPreview && e.preventDefault()}
                className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline transition-all"
                style={{ color: accentColor }}
              >
                {config.cta_label}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <a
                href={isPreview ? '#' : (config.cta_url || '#')}
                target={isPreview ? undefined : "_blank"}
                rel="noopener noreferrer"
                onClick={(e) => isPreview && e.preventDefault()}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md",
                  btnRadius
                )}
                style={ctaStyle}
              >
                {config.cta_label}
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
