import React from 'react';
import { cn } from '@/src/lib/utils';

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500',
  'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500',
  'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-green-500',
  'bg-amber-500', 'bg-orange-500', 'bg-red-500',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const LetterAvatar = ({ 
  name, 
  size = 'md', 
  className 
}: { 
  name: string; 
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; 
  className?: string 
}) => {
  const letter = (name || '?')[0].toUpperCase();
  const color = getAvatarColor(name || 'A');
  
  const sizes = { 
    xs: 'w-3.5 h-3.5 text-[7px]', 
    sm: 'w-8 h-8 text-sm', 
    md: 'w-12 h-12 text-lg', 
    lg: 'w-20 h-20 text-3xl',
    xl: 'w-28 h-28 text-4xl' 
  };

  return (
    <div className={cn(
      sizes[size], 
      color, 
      'rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none',
      className
    )}>
      {letter}
    </div>
  );
};
