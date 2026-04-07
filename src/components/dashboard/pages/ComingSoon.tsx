import React from 'react';
import { Construction } from 'lucide-react';

export const ComingSoon = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-transparent p-2">
      <div className="w-full h-full bg-card border border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 shadow-sm">
        <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-6 animate-pulse">
          <Construction className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground max-w-md font-medium">
          We're working hard to bring you the {title} feature. Stay tuned for updates!
        </p>
      </div>
    </div>
  );
};
