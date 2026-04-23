import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface RatingPromptProps {
  agentName: string;
  ratedEntityType: 'agent' | 'ai';
  primaryColor: string;
  theme: 'light' | 'dark';
  onSubmit: (score: number, comment: string) => void;
  onSkip: () => void;
}

export const RatingPrompt = ({
  agentName,
  ratedEntityType,
  primaryColor,
  theme,
  onSubmit,
  onSkip
}: RatingPromptProps) => {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedScore, setSelectedScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selectedScore === 0) return;
    setSubmitted(true);
    setTimeout(() => onSubmit(selectedScore, comment), 1500);
  };

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-4 z-50 backdrop-blur-md",
          theme === 'dark' ? "bg-[#1a1c1e]/95" : "bg-white/95"
        )}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
        >
          <span className="text-3xl">🎉</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn(
            "text-lg font-bold",
            theme === 'dark' ? "text-white" : "text-slate-800"
          )}
        >
          Thank you!
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={cn(
            "text-sm",
            theme === 'dark' ? "text-slate-400" : "text-slate-500"
          )}
        >
          Your feedback helps us improve
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className={cn(
        "absolute inset-x-0 bottom-0 z-50 rounded-t-3xl border-t shadow-2xl",
        theme === 'dark' 
          ? "bg-[#1a1c1e] border-slate-800 shadow-black/50" 
          : "bg-white border-slate-200 shadow-slate-300/50"
      )}
    >
      {/* Skip Button */}
      <button
        onClick={onSkip}
        className={cn(
          "absolute top-4 right-4 p-1.5 rounded-full transition-colors",
          theme === 'dark' ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"
        )}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-6 space-y-5">
        {/* Title */}
        <div className="text-center space-y-1.5">
          <p className={cn(
            "text-base font-bold",
            theme === 'dark' ? "text-white" : "text-slate-800"
          )}>
            How was your experience?
          </p>
          <p className={cn(
            "text-xs",
            theme === 'dark' ? "text-slate-500" : "text-slate-400"
          )}>
            {ratedEntityType === 'ai' 
              ? 'Rate your conversation with AI' 
              : `Rate your conversation with ${agentName}`
            }
          </p>
        </div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= (hoveredStar || selectedScore);
            return (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2, y: -4 }}
                whileTap={{ scale: 0.9 }}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setSelectedScore(star)}
                className="p-1 transition-all"
              >
                <Star
                  className={cn(
                    "w-9 h-9 transition-all duration-200",
                    isActive ? "fill-current drop-shadow-lg" : ""
                  )}
                  style={isActive ? { color: '#facc15', filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.4))' } : { color: theme === 'dark' ? '#334155' : '#cbd5e1' }}
                />
              </motion.button>
            );
          })}
        </div>

        {/* Label */}
        <AnimatePresence mode="wait">
          {(hoveredStar > 0 || selectedScore > 0) && (
            <motion.p
              key={hoveredStar || selectedScore}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "text-center text-xs font-bold uppercase tracking-widest",
                theme === 'dark' ? "text-slate-400" : "text-slate-500"
              )}
            >
              {labels[hoveredStar || selectedScore]}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Comment (only after selecting a score) */}
        <AnimatePresence>
          {selectedScore > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more (optional)..."
                rows={2}
                maxLength={500}
                className={cn(
                  "w-full p-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                  theme === 'dark' 
                    ? "bg-slate-900/50 border-slate-800 text-slate-200 placeholder-slate-600" 
                    : "bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400"
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={selectedScore === 0}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
            selectedScore > 0
              ? "text-white"
              : cn(
                  "cursor-not-allowed shadow-none",
                  theme === 'dark' ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-400"
                )
          )}
          style={selectedScore > 0 ? { 
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
            boxShadow: `0 4px 20px ${primaryColor}40`
          } : {}}
        >
          <Send className="w-4 h-4" />
          Submit Feedback
        </motion.button>
      </div>
    </motion.div>
  );
};
